#!/usr/bin/env node

/**
 * Generate Batch - Single Category Phrase Generation
 * 
 * Generates a batch of phrases for a specific category using the integrated pipeline
 * Renamed from generate-category.js for clarity
 */

const APIClient = require('../src/api-client');
const QualityPipeline = require('../src/quality-pipeline');
const PhraseDatabase = require('../src/database');
const config = require('../config');

class BatchGenerator {
  constructor(options = {}) {
    this.apiClient = new APIClient({ debug: options.debug });
    this.qualityPipeline = new QualityPipeline({ 
      debug: options.debug,
      autoAccept: config.QUALITY_THRESHOLDS.autoAccept,
      manualReview: config.QUALITY_THRESHOLDS.manualReview,
      autoReject: config.QUALITY_THRESHOLDS.autoReject
    });
    this.database = new PhraseDatabase();
    this.debug = options.debug || false;
    
    this.stats = {
      totalGenerated: 0,
      totalAccepted: 0,
      totalStored: 0,
      batchesCompleted: 0,
      averageScore: 0,
      acceptanceRate: 0,
      providersUsed: {}
    };
  }

  /**
   * Generate phrases for a specific category
   * @param {string} category - Category name
   * @param {number} targetCount - Target number of phrases
   * @param {number} batchSize - Phrases per batch
   */
  async generateForCategory(category, targetCount, batchSize = config.GENERATION_SETTINGS.defaultBatchSize) {
    // Validate category
    if (!config.isValidCategory(category)) {
      throw new Error(`Invalid category: ${category}. Valid categories: ${config.getCategoryList().join(', ')}`);
    }

    const categoryConfig = config.getCategoryConfig(category);
    console.log(`🎯 Starting generation for "${category}"`);
    console.log(`📊 Target: ${targetCount} phrases (${Math.ceil(targetCount / batchSize)} batches of ${batchSize})`);
    console.log(`📋 Category quota: ${categoryConfig.quota} phrases`);
    console.log('=' .repeat(60));

    await this.database.initialize();
    
    // Check existing phrases in this category
    const existingPhrases = await this.database.getPhrasesByCategory(category);
    console.log(`📋 Existing phrases in category: ${existingPhrases.length}`);
    
    if (existingPhrases.length >= targetCount) {
      console.log(`✅ Category "${category}" already has ${existingPhrases.length} phrases (target: ${targetCount})`);
      return this.stats;
    }

    // Check quota enforcement
    if (config.GENERATION_SETTINGS.enforceQuotas && targetCount > categoryConfig.quota) {
      console.log(`⚠️  Target ${targetCount} exceeds quota ${categoryConfig.quota} for "${category}"`);
      console.log(`📉 Reducing target to quota limit: ${categoryConfig.quota}`);
      targetCount = categoryConfig.quota;
    }

    const remainingCount = targetCount - existingPhrases.length;
    const batchesNeeded = Math.ceil(remainingCount / batchSize);
    
    console.log(`🚀 Need to generate ${remainingCount} more phrases (${batchesNeeded} batches)\n`);

    let totalAccepted = 0;
    let allScores = [];
    
    for (let batch = 1; batch <= batchesNeeded; batch++) {
      console.log(`\n📦 Batch ${batch}/${batchesNeeded}`);
      console.log('-'.repeat(30));
      
      try {
        // Get current phrases to avoid duplicates
        const currentPhrases = await this.database.getPhrasesByCategory(category);
        
        // Generate phrases with duplicate avoidance and provider attribution
        const result = await this.apiClient.generatePhrasesWithFallback(category, batchSize, currentPhrases);
        console.log(`📝 Generated ${result.phrases.length} phrases via ${result.service.toUpperCase()} (${result.modelId})`);
        
        // Track provider usage
        this.stats.providersUsed[result.service] = (this.stats.providersUsed[result.service] || 0) + 1;
        
        // Process through quality pipeline with provider attribution
        const qualityResult = await this.qualityPipeline.processBatch(
          result.phrases, 
          category, 
          result.service,
          result.modelId
        );
        
        const stats = this.qualityPipeline.getBatchStatistics(qualityResult);
        console.log(`📊 Quality: ${stats.acceptanceRate}% accepted, avg score ${stats.averageScore}/100 (${config.getQualityGrade(stats.averageScore)})`);
        
        // Store accepted phrases with provider attribution
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
              totalAccepted++;
              allScores.push(item.score);
              
              if (this.debug) {
                console.log(`  ✅ Stored: "${item.phrase}" (${item.score}/100, ${item.sourceProvider})`);
              }
            }
          } catch (error) {
            console.log(`  ❌ Failed: "${item.phrase}" - ${error.message}`);
          }
        }
        
        if (duplicateCount > 0) {
          console.log(`💾 Stored ${storedCount}/${acceptedPhrases.length} accepted phrases (${duplicateCount} duplicates skipped)`);
        } else {
          console.log(`💾 Stored ${storedCount}/${acceptedPhrases.length} accepted phrases`);
        }
        
        // Update running statistics
        this.stats.totalGenerated += result.phrases.length;
        this.stats.totalAccepted += acceptedPhrases.length;
        this.stats.totalStored += storedCount;
        this.stats.batchesCompleted = batch;
        
        // Brief pause between batches per configuration
        if (batch < batchesNeeded) {
          console.log(`⏸️  Pausing ${config.GENERATION_SETTINGS.batchDelayMs}ms between batches...`);
          await this.delay(config.GENERATION_SETTINGS.batchDelayMs);
        }
        
      } catch (error) {
        console.error(`❌ Batch ${batch} failed:`, error.message);
        console.log('⏭️  Continuing with next batch...');
      }
    }
    
    // Final verification
    const finalPhrases = await this.database.getPhrasesByCategory(category);
    const finalCount = finalPhrases.length;
    
    // Calculate final statistics
    this.stats.averageScore = allScores.length > 0 
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;
    this.stats.acceptanceRate = this.stats.totalGenerated > 0
      ? Math.round((this.stats.totalAccepted / this.stats.totalGenerated) * 100)
      : 0;
    
    console.log('\n🎉 Generation Complete for ' + category);
    console.log('='.repeat(60));
    console.log(`📊 Final Results:`);
    console.log(`   Total in category: ${finalCount}/${targetCount} phrases`);
    console.log(`   Generated this session: ${this.stats.totalGenerated} phrases`);
    console.log(`   Accepted this session: ${this.stats.totalAccepted} phrases`);
    console.log(`   Stored this session: ${this.stats.totalStored} phrases`);
    console.log(`   Acceptance rate: ${this.stats.acceptanceRate}%`);
    console.log(`   Average score: ${this.stats.averageScore}/100 (${config.getQualityGrade(this.stats.averageScore)})`);
    console.log(`   Batches completed: ${this.stats.batchesCompleted}`);
    console.log(`   Providers used: ${Object.entries(this.stats.providersUsed).map(([p, c]) => `${p}(${c})`).join(', ')}`);
    
    if (finalCount >= targetCount) {
      console.log(`✅ SUCCESS: Target reached for "${category}"!`);
    } else {
      console.log(`⚠️  PARTIAL: Need ${targetCount - finalCount} more phrases for "${category}"`);
    }
    
    await this.database.close();
    return this.stats;
  }

  /**
   * Show sample phrases from a category
   * @param {string} category - Category name
   * @param {number} count - Number of phrases to show
   */
  async showSamplePhrases(category, count = 10) {
    await this.database.initialize();
    const phrases = await this.database.getPhrasesByCategory(category);
    
    console.log(`\n📝 Sample phrases from "${category}" (${Math.min(count, phrases.length)} of ${phrases.length}):`);
    phrases.slice(0, count).forEach((phrase, i) => {
      const providerInfo = phrase.source_provider ? ` [${phrase.source_provider}]` : '';
      console.log(`  ${i + 1}. "${phrase.phrase}" (${phrase.score}/100)${providerInfo}`);
    });
    
    await this.database.close();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const category = args[0];
  const targetCount = parseInt(args[1]) || 100;
  const debug = args.includes('--debug');
  const showSample = args.includes('--sample');
  
  if (!category) {
    console.log(`
Batch Phrase Generator

Usage:
  node scripts/generate-batch.js <category> [target-count] [--debug] [--sample]

Examples:
  node scripts/generate-batch.js "Movies & TV" 100
  node scripts/generate-batch.js "Music & Artists" 100 --debug
  node scripts/generate-batch.js "Sports & Athletes" 100 --sample

Available Categories:
${config.getCategoryList().map(cat => `  - ${cat} (quota: ${config.getCategoryConfig(cat).quota})`).join('\n')}
    `);
    process.exit(1);
  }

  const generator = new BatchGenerator({ debug });
  
  if (showSample) {
    generator.showSamplePhrases(category, 15)
      .catch(error => {
        console.error('❌ Error showing samples:', error.message);
        process.exit(1);
      });
  } else {
    generator.generateForCategory(category, targetCount)
      .then(stats => {
        console.log('\n📈 Session Statistics:');
        console.log(`   Generated: ${stats.totalGenerated}`);
        console.log(`   Accepted: ${stats.totalAccepted} (${stats.acceptanceRate}%)`);
        console.log(`   Stored: ${stats.totalStored}`);
        console.log(`   Average Score: ${stats.averageScore}/100`);
        console.log(`   Providers: ${Object.keys(stats.providersUsed).join(', ')}`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Generation failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = BatchGenerator; 