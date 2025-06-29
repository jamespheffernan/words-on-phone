#!/usr/bin/env node

/**
 * Process Batch - Quality Pipeline for Existing Phrases
 * 
 * Processes existing phrases through the quality pipeline for scoring and validation
 * Useful for re-evaluating phrases after quality improvements
 */

const QualityPipeline = require('../src/quality-pipeline');
const PhraseDatabase = require('../src/database');
const config = require('../config');

class BatchProcessor {
  constructor(options = {}) {
    this.qualityPipeline = new QualityPipeline({ 
      debug: options.debug,
      autoAccept: config.QUALITY_THRESHOLDS.autoAccept,
      manualReview: config.QUALITY_THRESHOLDS.manualReview,
      autoReject: config.QUALITY_THRESHOLDS.autoReject
    });
    this.database = new PhraseDatabase();
    this.debug = options.debug || false;
    
    this.stats = {
      totalProcessed: 0,
      updated: 0,
      errors: 0,
      scoreChanges: {
        improved: 0,
        degraded: 0,
        unchanged: 0
      },
      qualityDistribution: {
        accept: 0,
        review: 0,
        reject: 0
      }
    };
  }

  /**
   * Process all phrases in a category through quality pipeline
   * @param {string} category - Category to process
   * @param {Object} options - Processing options
   */
  async processCategory(category, options = {}) {
    if (!config.isValidCategory(category)) {
      throw new Error(`Invalid category: ${category}. Valid categories: ${config.getCategoryList().join(', ')}`);
    }

    console.log(`🔄 Processing phrases in "${category}" through quality pipeline`);
    console.log('=' .repeat(60));

    await this.database.initialize();
    
    // Get all phrases in category
    const phrases = await this.database.getPhrasesByCategory(category);
    
    if (phrases.length === 0) {
      console.log(`📭 No phrases found in category "${category}"`);
      return this.stats;
    }

    console.log(`📋 Found ${phrases.length} phrases to process`);
    
    // Filter phrases if needed
    let phrasesToProcess = phrases;
    
    if (options.unscored) {
      phrasesToProcess = phrases.filter(p => !p.score || p.score === 0);
      console.log(`🎯 Processing ${phrasesToProcess.length} unscored phrases`);
    }
    
    if (options.lowScore) {
      const threshold = options.lowScore;
      phrasesToProcess = phrases.filter(p => p.score < threshold);
      console.log(`🎯 Processing ${phrasesToProcess.length} phrases with score < ${threshold}`);
    }

    if (phrasesToProcess.length === 0) {
      console.log(`✅ No phrases match processing criteria`);
      return this.stats;
    }

    // Process phrases in batches for better performance
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < phrasesToProcess.length; i += batchSize) {
      batches.push(phrasesToProcess.slice(i, i + batchSize));
    }

    console.log(`🚀 Processing ${phrasesToProcess.length} phrases in ${batches.length} batches\n`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} phrases)`);
      
      await this.processPhrasesBatch(batch, category, options);
      
      // Progress indicator
      const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
      console.log(`📈 Progress: ${progress}%`);
      
      // Brief pause between batches
      if (batchIndex < batches.length - 1) {
        await this.delay(1000);
      }
    }

    console.log('\n🎉 Processing Complete for ' + category);
    console.log('='.repeat(60));
    console.log(`📊 Processing Results:`);
    console.log(`   Total processed: ${this.stats.totalProcessed}`);
    console.log(`   Updated: ${this.stats.updated}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Score changes:`);
    console.log(`     Improved: ${this.stats.scoreChanges.improved}`);
    console.log(`     Degraded: ${this.stats.scoreChanges.degraded}`);
    console.log(`     Unchanged: ${this.stats.scoreChanges.unchanged}`);
    console.log(`   Quality distribution:`);
    console.log(`     Accept (≥${config.QUALITY_THRESHOLDS.autoAccept}): ${this.stats.qualityDistribution.accept}`);
    console.log(`     Review (${config.QUALITY_THRESHOLDS.manualReview}-${config.QUALITY_THRESHOLDS.autoAccept-1}): ${this.stats.qualityDistribution.review}`);
    console.log(`     Reject (<${config.QUALITY_THRESHOLDS.autoReject}): ${this.stats.qualityDistribution.reject}`);

    await this.database.close();
    return this.stats;
  }

  /**
   * Process a batch of phrases
   * @param {Array} phrases - Phrases to process
   * @param {string} category - Category name
   * @param {Object} options - Processing options
   */
  async processPhrasesBatch(phrases, category, options = {}) {
    for (const phraseRecord of phrases) {
      try {
        // Process through quality pipeline
        const processed = await this.qualityPipeline.processSinglePhrase(
          phraseRecord.phrase, 
          category,
          phraseRecord.source_provider || 'unknown',
          phraseRecord.model_id || null
        );

        this.stats.totalProcessed++;

        // Update quality distribution
        if (processed.decision === 'accept') {
          this.stats.qualityDistribution.accept++;
        } else if (processed.decision === 'review') {
          this.stats.qualityDistribution.review++;
        } else {
          this.stats.qualityDistribution.reject++;
        }

        // Check if score changed significantly
        const oldScore = phraseRecord.score || 0;
        const newScore = processed.score;
        const scoreDiff = newScore - oldScore;

        if (Math.abs(scoreDiff) >= 5) { // Only update if significant change
          // Update score in database
          await this.database.run(
            'UPDATE phrases SET score = ? WHERE id = ?',
            [newScore, phraseRecord.id]
          );
          
          this.stats.updated++;
          
          if (scoreDiff > 0) {
            this.stats.scoreChanges.improved++;
          } else {
            this.stats.scoreChanges.degraded++;
          }
          
          if (this.debug) {
            console.log(`  📊 Updated: "${phraseRecord.phrase}" ${oldScore}→${newScore} (${scoreDiff > 0 ? '+' : ''}${scoreDiff})`);
          }
        } else {
          this.stats.scoreChanges.unchanged++;
        }

      } catch (error) {
        this.stats.errors++;
        console.error(`❌ Failed to process "${phraseRecord.phrase}":`, error.message);
      }
    }
  }

  /**
   * Show quality distribution for a category
   * @param {string} category - Category name
   */
  async showQualityDistribution(category) {
    await this.database.initialize();
    
    const phrases = await this.database.getPhrasesByCategory(category);
    
    if (phrases.length === 0) {
      console.log(`📭 No phrases found in category "${category}"`);
      return;
    }

    const distribution = {
      accept: phrases.filter(p => p.score >= config.QUALITY_THRESHOLDS.autoAccept).length,
      review: phrases.filter(p => p.score >= config.QUALITY_THRESHOLDS.manualReview && p.score < config.QUALITY_THRESHOLDS.autoAccept).length,
      reject: phrases.filter(p => p.score < config.QUALITY_THRESHOLDS.autoReject).length,
      unscored: phrases.filter(p => !p.score || p.score === 0).length
    };

    const avgScore = phrases.length > 0 
      ? Math.round(phrases.reduce((sum, p) => sum + (p.score || 0), 0) / phrases.length)
      : 0;

    console.log(`\n📊 Quality Distribution for "${category}" (${phrases.length} phrases):`);
    console.log(`   Accept (≥${config.QUALITY_THRESHOLDS.autoAccept}): ${distribution.accept} (${Math.round(distribution.accept/phrases.length*100)}%)`);
    console.log(`   Review (${config.QUALITY_THRESHOLDS.manualReview}-${config.QUALITY_THRESHOLDS.autoAccept-1}): ${distribution.review} (${Math.round(distribution.review/phrases.length*100)}%)`);
    console.log(`   Reject (<${config.QUALITY_THRESHOLDS.autoReject}): ${distribution.reject} (${Math.round(distribution.reject/phrases.length*100)}%)`);
    console.log(`   Unscored: ${distribution.unscored} (${Math.round(distribution.unscored/phrases.length*100)}%)`);
    console.log(`   Average Score: ${avgScore}/100 (${config.getQualityGrade(avgScore)})`);

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
  const debug = args.includes('--debug');
  const unscored = args.includes('--unscored');
  const showDistribution = args.includes('--distribution');
  const lowScoreArg = args.find(arg => arg.startsWith('--low-score='));
  const lowScore = lowScoreArg ? parseInt(lowScoreArg.split('=')[1]) : null;
  
  if (!category) {
    console.log(`
Batch Quality Processor

Usage:
  node scripts/process-batch.js <category> [options]

Options:
  --debug           Enable debug output
  --unscored        Process only unscored phrases
  --low-score=N     Process only phrases with score < N
  --distribution    Show quality distribution only

Examples:
  node scripts/process-batch.js "Movies & TV"
  node scripts/process-batch.js "Music & Artists" --unscored --debug
  node scripts/process-batch.js "Sports & Athletes" --low-score=40
  node scripts/process-batch.js "Food & Drink" --distribution

Available Categories:
${config.getCategoryList().map(cat => `  - ${cat}`).join('\n')}
    `);
    process.exit(1);
  }

  const processor = new BatchProcessor({ debug });
  
  if (showDistribution) {
    processor.showQualityDistribution(category)
      .catch(error => {
        console.error('❌ Error showing distribution:', error.message);
        process.exit(1);
      });
  } else {
    const options = { unscored, lowScore };
    
    processor.processCategory(category, options)
      .then(stats => {
        console.log('\n📈 Processing Statistics:');
        console.log(`   Processed: ${stats.totalProcessed}`);
        console.log(`   Updated: ${stats.updated}`);
        console.log(`   Errors: ${stats.errors}`);
        console.log(`   Score Improvements: ${stats.scoreChanges.improved}`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Processing failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = BatchProcessor; 