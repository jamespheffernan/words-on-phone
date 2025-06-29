#!/usr/bin/env node

/**
 * Batch Queue Runner - Automated Multi-Category Phrase Generation
 * 
 * Autonomously generates phrases across categories until quotas are met
 * Features: concurrent generation, rate limiting, crash recovery, progress tracking
 */

const APIClient = require('../src/api-client');
const QualityPipeline = require('../src/quality-pipeline');
const PhraseDatabase = require('../src/database');
const CategoryBloomFilter = require('../src/bloomFilter');
const PromptBuilder = require('../src/promptBuilder');
const config = require('../config');
const path = require('path');
const fs = require('fs-extra');

// Generation log for crash recovery
const GENERATION_LOG_PATH = path.join(__dirname, '..', 'data', 'generation-log.json');

class BatchQueueRunner {
  constructor(options = {}) {
    this.apiClient = new APIClient({ debug: options.debug });
    this.qualityPipeline = new QualityPipeline({ 
      debug: options.debug,
      autoAccept: config.QUALITY_THRESHOLDS.autoAccept,
      manualReview: config.QUALITY_THRESHOLDS.manualReview,
      autoReject: config.QUALITY_THRESHOLDS.autoReject
    });
    this.database = new PhraseDatabase();
    this.bloomFilter = null; // Will be initialized after database
    this.promptBuilder = null; // Will be initialized after database
    this.debug = options.debug || false;
    
    // Configuration
    this.maxConcurrentBatches = options.maxConcurrent || config.GENERATION_SETTINGS.maxConcurrentBatches;
    this.batchSize = options.batchSize || config.GENERATION_SETTINGS.defaultBatchSize;
    this.maxBatches = options.maxBatches || null; // Null = unlimited
    this.enforceQuotas = options.enforceQuotas !== false; // Default true
    this.categories = options.categories || config.getCategoryList();
    
    // Rate limiting
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.dailyRequestCount = 0;
    this.dailyRequestResetTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
    
    // State tracking
    this.activeBatches = new Set();
    this.completedBatches = 0;
    this.startTime = Date.now();
    
    // Statistics
    this.stats = {
      totalGenerated: 0,
      totalAccepted: 0,
      totalStored: 0,
      batchesCompleted: 0,
      batchesFailed: 0,
      averageScore: 0,
      acceptanceRate: 0,
      providersUsed: {},
      categoriesUpdated: {},
      timeElapsed: 0,
      estimatedTimeRemaining: 0,
      bloomFilterStats: {
        totalCandidates: 0,
        bloomHits: 0,
        bloomMisses: 0,
        filterEfficiency: 0
      }
    };
    
    // Generation log for crash recovery
    this.generationLog = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastUpdate: Date.now(),
      targetCategories: this.categories,
      completed: [],
      inProgress: [],
      failed: [],
      stats: { ...this.stats }
    };
  }

  /**
   * Generate session ID for tracking
   */
  generateSessionId() {
    return `batch-queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load existing generation log for crash recovery
   */
  async loadGenerationLog() {
    try {
      if (await fs.pathExists(GENERATION_LOG_PATH)) {
        const logData = await fs.readJson(GENERATION_LOG_PATH);
        console.log(`📄 Found existing generation log from ${new Date(logData.startTime).toLocaleString()}`);
        console.log(`📊 Previous session: ${logData.completed.length} completed, ${logData.failed.length} failed`);
        
        // Ask user if they want to resume
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const resume = await new Promise((resolve) => {
          rl.question('Resume previous session? (y/n): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase().startsWith('y'));
          });
        });
        
        if (resume) {
          this.generationLog = { ...logData };
          this.generationLog.lastUpdate = Date.now();
          console.log(`✅ Resuming session ${this.generationLog.sessionId}`);
          return true;
        } else {
          console.log(`🆕 Starting new session`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not load generation log: ${error.message}`);
    }
    return false;
  }

  /**
   * Save generation log for crash recovery
   */
  async saveGenerationLog() {
    try {
      this.generationLog.lastUpdate = Date.now();
      this.generationLog.stats = { ...this.stats };
      await fs.ensureDir(path.dirname(GENERATION_LOG_PATH));
      await fs.writeJson(GENERATION_LOG_PATH, this.generationLog, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save generation log:', error.message);
    }
  }

  /**
   * Check rate limits before making request
   */
  async checkRateLimit() {
    const now = Date.now();
    
    // Reset daily counter if needed
    if (now > this.dailyRequestResetTime) {
      this.dailyRequestCount = 0;
      this.dailyRequestResetTime = now + (24 * 60 * 60 * 1000);
    }
    
    // Check daily limit
    if (this.dailyRequestCount >= config.GENERATION_SETTINGS.rateLimitRpd) {
      throw new Error(`Daily rate limit reached (${config.GENERATION_SETTINGS.rateLimitRpd} requests/day)`);
    }
    
    // Check per-minute limit
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = Math.ceil(60000 / config.GENERATION_SETTINGS.rateLimitRpm); // ms between requests
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms...`);
      await this.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
    this.dailyRequestCount++;
  }

  /**
   * Get priority queue of categories that need phrases
   */
  async getCategoryQueue() {
    await this.database.initialize();
    
    // Initialize Bloom filters and prompt builder if not already done
    if (!this.bloomFilter) {
      console.log('🔍 Initializing Bloom filters for duplicate pre-filtering...');
      this.bloomFilter = new CategoryBloomFilter(this.database);
      await this.bloomFilter.initialize();
      console.log('✅ Bloom filters ready');
    }
    
    if (!this.promptBuilder) {
      console.log('📝 Initializing enhanced prompt builder...');
      this.promptBuilder = new PromptBuilder(this.database);
      console.log('✅ Prompt builder ready');
    }
    
    const queue = [];
    
    for (const categoryName of this.categories) {
      const categoryConfig = config.getCategoryConfig(categoryName);
      const existingPhrases = await this.database.getPhrasesByCategory(categoryName);
      const currentCount = existingPhrases.length;
      const targetQuota = this.enforceQuotas ? categoryConfig.quota : Infinity;
      
      if (currentCount < targetQuota) {
        const needed = targetQuota - currentCount;
        const priority = this.calculateCategoryPriority(categoryName, currentCount, targetQuota);
        
        queue.push({
          category: categoryName,
          currentCount,
          targetQuota,
          needed,
          priority,
          config: categoryConfig
        });
      }
    }
    
    // Sort by priority (higher priority first)
    queue.sort((a, b) => b.priority - a.priority);
    
    return queue;
  }

  /**
   * Calculate priority for a category (higher = more urgent)
   */
  calculateCategoryPriority(categoryName, currentCount, targetQuota) {
    const completionRatio = currentCount / targetQuota;
    const urgencyBonus = completionRatio < 0.1 ? 100 : // Very behind
                        completionRatio < 0.3 ? 50 :  // Behind
                        completionRatio < 0.7 ? 20 :  // Moderate
                        10;                           // Almost done
    
    // Give bonus to entertainment categories for better gameplay
    const entertainmentBonus = ['Movies & TV', 'Music & Artists', 'Entertainment & Pop Culture'].includes(categoryName) ? 25 : 0;
    
    return urgencyBonus + entertainmentBonus + Math.random() * 5; // Small randomization
  }

  /**
   * Generate a single batch for a category
   */
  async generateBatch(categoryItem) {
    const { category } = categoryItem;
    const batchId = `${category}-${Date.now()}`;
    
    this.activeBatches.add(batchId);
    this.generationLog.inProgress.push({ category, batchId, startTime: Date.now() });
    
    try {
      console.log(`\n🚀 Starting batch for "${category}" (${categoryItem.needed} needed)`);
      
      await this.checkRateLimit();
      
      // Get current phrases to avoid duplicates
      const currentPhrases = await this.database.getPhrasesByCategory(category);
      
      // Build enhanced prompt with duplicate avoidance
      const enhancedPrompt = await this.promptBuilder.buildEnhancedPrompt(category, this.batchSize);

      if (this.debug) {
        console.log(`📝 [BatchQueueRunner] Enhanced prompt for category '${category}':\n${enhancedPrompt}`);
      }
      // Generate phrases with enhanced prompt and provider attribution
      const result = await this.apiClient.generatePhrasesWithFallback(category, this.batchSize, currentPhrases, {
        customPrompt: enhancedPrompt
      });
      console.log(`📝 Generated ${result.phrases.length} phrases via ${result.service.toUpperCase()} (${result.modelId})`);
      
      // Pre-filter candidates with Bloom filter
      const candidates = result.phrases.map(phrase => ({ phrase, category }));
      const bloomResult = this.bloomFilter.filterCandidates(candidates);
      
      // Update Bloom filter statistics
      this.stats.bloomFilterStats.totalCandidates += bloomResult.stats.totalCandidates;
      this.stats.bloomFilterStats.bloomHits += bloomResult.stats.possibleDuplicates;
      this.stats.bloomFilterStats.bloomMisses += bloomResult.stats.likelyNew;
      this.stats.bloomFilterStats.filterEfficiency = this.stats.bloomFilterStats.bloomHits / this.stats.bloomFilterStats.totalCandidates;
      
      console.log(`🔍 Bloom filter: ${bloomResult.stats.likelyNew} likely new, ${bloomResult.stats.possibleDuplicates} possible duplicates (${(bloomResult.stats.filterEfficiency * 100).toFixed(1)}% efficiency)`);
      
      // Track provider usage
      this.stats.providersUsed[result.service] = (this.stats.providersUsed[result.service] || 0) + 1;
      
      // Process only likely-new phrases through quality pipeline (skip Bloom filter hits)
      const phrasesToProcess = bloomResult.filtered.map(candidate => candidate.phrase);
      const qualityResult = await this.qualityPipeline.processBatch(
        phrasesToProcess, 
        category, 
        result.service,
        result.modelId
      );
      
      const batchStats = this.qualityPipeline.getBatchStatistics(qualityResult);
      console.log(`📊 Quality: ${batchStats.acceptanceRate}% accepted, avg score ${batchStats.averageScore}/100`);
      
             // Store accepted phrases
       const acceptedPhrases = qualityResult.processed.filter(p => p.decision === 'accept');
       let storedCount = 0;
       let duplicateCount = 0;
       
       for (const item of acceptedPhrases) {
         try {
           const result = await this.database.addPhraseIgnoreDuplicates(item.phrase, category, { 
             score: item.score,
             sourceProvider: item.sourceProvider,
             modelId: item.modelId
           });
           
           if (result.skipped) {
             duplicateCount++;
             if (this.debug) {
               console.log(`  ⚠️  Duplicate: "${item.phrase}"`);
             }
           } else {
             storedCount++;
             // Update Bloom filter with newly stored phrase
             this.bloomFilter.addPhrase(item.phrase, category);
             if (this.debug) {
               console.log(`  ✅ Stored: "${item.phrase}" (${item.score}/100, ${item.sourceProvider})`);
             }
           }
         } catch (error) {
           console.log(`  ❌ Failed: "${item.phrase}" - ${error.message}`);
         }
       }
      
      // Update statistics
      this.stats.totalGenerated += result.phrases.length;
      this.stats.totalAccepted += acceptedPhrases.length;
      this.stats.totalStored += storedCount;
      this.stats.batchesCompleted++;
      this.stats.categoriesUpdated[category] = (this.stats.categoriesUpdated[category] || 0) + storedCount;
      
             if (duplicateCount > 0) {
         console.log(`💾 Stored ${storedCount}/${acceptedPhrases.length} accepted phrases (${duplicateCount} duplicates skipped)`);
       } else {
         console.log(`💾 Stored ${storedCount}/${acceptedPhrases.length} accepted phrases`);
       }
      
      // Mark batch as completed
      this.generationLog.completed.push({ 
        category, 
        batchId, 
        startTime: this.generationLog.inProgress.find(b => b.batchId === batchId)?.startTime,
        endTime: Date.now(),
        generated: result.phrases.length,
        accepted: acceptedPhrases.length,
        stored: storedCount,
        provider: result.service
      });
      
      this.generationLog.inProgress = this.generationLog.inProgress.filter(b => b.batchId !== batchId);
      
      return { success: true, stored: storedCount };
      
    } catch (error) {
      console.error(`❌ Batch failed for "${category}":`, error.message);
      
      this.stats.batchesFailed++;
      this.generationLog.failed.push({ 
        category, 
        batchId, 
        error: error.message, 
        timestamp: Date.now() 
      });
      this.generationLog.inProgress = this.generationLog.inProgress.filter(b => b.batchId !== batchId);
      
      return { success: false, error: error.message };
      
    } finally {
      this.activeBatches.delete(batchId);
      await this.saveGenerationLog();
    }
  }

  /**
   * Main runner method
   */
  async run() {
    console.log('🎯 Batch Queue Runner Starting');
    console.log('=' .repeat(60));
    console.log(`📊 Configuration:`);
    console.log(`   Max concurrent batches: ${this.maxConcurrentBatches}`);
    console.log(`   Batch size: ${this.batchSize} phrases`);
    console.log(`   Max batches: ${this.maxBatches || 'unlimited'}`);
    console.log(`   Enforce quotas: ${this.enforceQuotas}`);
    console.log(`   Target categories: ${this.categories.length}`);
    console.log(`   Rate limits: ${config.GENERATION_SETTINGS.rateLimitRpm} RPM, ${config.GENERATION_SETTINGS.rateLimitRpd} RPD`);
    console.log('=' .repeat(60));
    
    // Load existing log for crash recovery
    await this.loadGenerationLog();
    
    await this.database.initialize();
    
    let totalTimeStart = Date.now();
    
    while (true) {
      // Check if we've hit the max batch limit
      if (this.maxBatches && this.stats.batchesCompleted >= this.maxBatches) {
        console.log(`🎯 Reached maximum batch limit (${this.maxBatches})`);
        break;
      }
      
      // Get priority queue of categories needing phrases
      const categoryQueue = await this.getCategoryQueue();
      
      if (categoryQueue.length === 0) {
        console.log('🎉 All categories have reached their quotas!');
        break;
      }
      
      // Show current progress
      this.showProgress(categoryQueue);
      
      // Generate batches concurrently up to limit
      const batchPromises = [];
      const categoriesToProcess = categoryQueue.slice(0, this.maxConcurrentBatches - this.activeBatches.size);
      
      for (const categoryItem of categoriesToProcess) {
        if (this.activeBatches.size < this.maxConcurrentBatches) {
          batchPromises.push(this.generateBatch(categoryItem));
        }
      }
      
      if (batchPromises.length === 0) {
        console.log('⏸️ No batches to process, waiting...');
        await this.delay(5000);
        continue;
      }
      
      // Wait for at least one batch to complete before continuing
      await Promise.race(batchPromises);
      
      // Brief pause between rounds
      await this.delay(config.GENERATION_SETTINGS.batchDelayMs);
    }
    
    // Final statistics
    const totalTime = Date.now() - totalTimeStart;
    this.stats.timeElapsed = totalTime;
    
    console.log('\n🎉 Batch Queue Runner Complete');
    console.log('=' .repeat(60));
    this.showFinalStatistics();
    
    await this.database.close();
    
    // Clean up generation log on successful completion
    try {
      await fs.remove(GENERATION_LOG_PATH);
      console.log('🧹 Cleaned up generation log');
    } catch (error) {
      console.log('⚠️ Could not clean up generation log:', error.message);
    }
    
    return this.stats;
  }

  /**
   * Show current progress
   */
  showProgress(categoryQueue) {
    console.log(`\n📊 Progress Update (${new Date().toLocaleTimeString()})`);
    console.log('-' .repeat(50));
    console.log(`📦 Active batches: ${this.activeBatches.size}/${this.maxConcurrentBatches}`);
    console.log(`✅ Completed batches: ${this.stats.batchesCompleted}`);
    console.log(`❌ Failed batches: ${this.stats.batchesFailed}`);
    console.log(`💾 Total phrases stored: ${this.stats.totalStored}`);
    
    if (categoryQueue.length > 0) {
      console.log(`\n🎯 Next ${Math.min(5, categoryQueue.length)} priorities:`);
      for (let i = 0; i < Math.min(5, categoryQueue.length); i++) {
        const item = categoryQueue[i];
        const progress = Math.round((item.currentCount / item.targetQuota) * 100);
        console.log(`   ${i + 1}. ${item.category}: ${item.currentCount}/${item.targetQuota} (${progress}%)`);
      }
    }
  }

  /**
   * Show final statistics
   */
  showFinalStatistics() {
    const timeMinutes = Math.round(this.stats.timeElapsed / 60000);
    const avgBatchTime = this.stats.batchesCompleted > 0 ? Math.round(this.stats.timeElapsed / this.stats.batchesCompleted / 1000) : 0;
    
    console.log(`📊 Final Statistics:`);
    console.log(`   Session ID: ${this.generationLog.sessionId}`);
    console.log(`   Total time: ${timeMinutes} minutes`);
    console.log(`   Batches completed: ${this.stats.batchesCompleted}`);
    console.log(`   Batches failed: ${this.stats.batchesFailed}`);
    console.log(`   Average batch time: ${avgBatchTime}s`);
    console.log(`   Total phrases generated: ${this.stats.totalGenerated}`);
    console.log(`   Total phrases accepted: ${this.stats.totalAccepted}`);
    console.log(`   Total phrases stored: ${this.stats.totalStored}`);
    
    if (this.stats.totalGenerated > 0) {
      this.stats.acceptanceRate = Math.round((this.stats.totalAccepted / this.stats.totalGenerated) * 100);
      console.log(`   Overall acceptance rate: ${this.stats.acceptanceRate}%`);
    }
    
    if (Object.keys(this.stats.providersUsed).length > 0) {
      console.log(`   Providers used: ${Object.entries(this.stats.providersUsed).map(([p, c]) => `${p}(${c})`).join(', ')}`);
    }
    
    if (Object.keys(this.stats.categoriesUpdated).length > 0) {
      console.log(`\n📋 Categories updated:`);
      Object.entries(this.stats.categoriesUpdated)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`   ${category}: +${count} phrases`);
        });
    }
    
    // Show Bloom filter efficiency stats
    if (this.stats.bloomFilterStats.totalCandidates > 0) {
      console.log(`\n🔍 Bloom Filter Performance:`);
      console.log(`   Total candidates processed: ${this.stats.bloomFilterStats.totalCandidates}`);
      console.log(`   Likely duplicates filtered: ${this.stats.bloomFilterStats.bloomHits}`);
      console.log(`   Likely new phrases processed: ${this.stats.bloomFilterStats.bloomMisses}`);
      console.log(`   Filter efficiency: ${(this.stats.bloomFilterStats.filterEfficiency * 100).toFixed(1)}%`);
      
      if (this.stats.bloomFilterStats.filterEfficiency > 0.4) {
        console.log(`   🎯 High duplicate detection rate - Bloom filters working effectively!`);
      } else if (this.stats.bloomFilterStats.filterEfficiency > 0.2) {
        console.log(`   ⚡ Moderate duplicate detection - some efficiency gains`);
      } else {
        console.log(`   📈 Low duplicate detection - categories may need more phrases to see efficiency`);
      }
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--max-concurrent':
        options.maxConcurrent = parseInt(args[++i]);
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--max-batches':
        options.maxBatches = parseInt(args[++i]);
        break;
      case '--no-quotas':
        options.enforceQuotas = false;
        break;
      case '--categories':
        options.categories = args[++i].split(',').map(c => c.trim());
        break;
    }
  }
  
  // Validate options
  if (options.maxConcurrent && (options.maxConcurrent < 1 || options.maxConcurrent > 5)) {
    console.error('Error: --max-concurrent must be between 1 and 5');
    process.exit(1);
  }
  
  if (options.batchSize && (options.batchSize < 5 || options.batchSize > 25)) {
    console.error('Error: --batch-size must be between 5 and 25');
    process.exit(1);
  }
  
  if (options.categories) {
    const validCategories = config.getCategoryList();
    const invalidCategories = options.categories.filter(c => !validCategories.includes(c));
    if (invalidCategories.length > 0) {
      console.error(`Error: Invalid categories: ${invalidCategories.join(', ')}`);
      console.error(`Valid categories: ${validCategories.join(', ')}`);
      process.exit(1);
    }
  }
  
  try {
    const runner = new BatchQueueRunner(options);
    const stats = await runner.run();
    
    console.log('\n✅ Batch queue runner completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Batch queue runner failed:', error.message);
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📦 Batch Queue Runner - Automated Multi-Category Phrase Generation

USAGE:
  node batch-queue-runner.js [options]

OPTIONS:
  --help, -h              Show this help message
  --debug                 Enable debug logging
  --max-concurrent <n>    Max concurrent batches (1-5, default: 2)
  --batch-size <n>        Phrases per batch (5-25, default: 15)
  --max-batches <n>       Maximum total batches to run (default: unlimited)
  --no-quotas             Ignore category quotas
  --categories <list>     Comma-separated list of categories to process

EXAMPLES:
  # Run with default settings
  node batch-queue-runner.js

  # Generate 150 phrases (10 batches) with debug logging
  node batch-queue-runner.js --max-batches 10 --debug

  # Focus on specific categories
  node batch-queue-runner.js --categories "Movies & TV,Music & Artists"

  # High throughput mode
  node batch-queue-runner.js --max-concurrent 3 --batch-size 20

FEATURES:
  ✅ Automatic crash recovery with generation log
  ✅ Concurrent batch processing with rate limiting
  ✅ Priority-based category queue
  ✅ Real-time progress tracking
  ✅ Provider attribution and quality control
  ✅ Comprehensive statistics and reporting

SUCCESS CRITERIA:
  Target: Generate 150 phrases (~10 batches) in <20 min without manual supervision
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = BatchQueueRunner; 