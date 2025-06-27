#!/usr/bin/env node

/**
 * Category Phrase Generation Script
 * 
 * Generates phrases for a specific category using the integrated pipeline
 */

const APIClient = require('../src/api-client');
const QualityPipeline = require('../src/quality-pipeline');
const PhraseDatabase = require('../src/database');

class CategoryGenerator {
  constructor(options = {}) {
    this.apiClient = new APIClient({ debug: options.debug });
    this.qualityPipeline = new QualityPipeline({ debug: options.debug });
    this.database = new PhraseDatabase('./data/phrases.db');
    this.debug = options.debug || false;
    
    this.stats = {
      totalGenerated: 0,
      totalAccepted: 0,
      totalStored: 0,
      batchesCompleted: 0,
      averageScore: 0,
      acceptanceRate: 0
    };
  }

  /**
   * Generate phrases for a specific category
   * @param {string} category - Category name
   * @param {number} targetCount - Target number of phrases
   * @param {number} batchSize - Phrases per batch (default 15)
   */
  async generateForCategory(category, targetCount, batchSize = 15) {
    console.log(`🎯 Starting generation for "${category}"`);
    console.log(`📊 Target: ${targetCount} phrases (${Math.ceil(targetCount / batchSize)} batches of ${batchSize})`);
    console.log('=' .repeat(60));

    await this.database.initialize();
    
    // Check existing phrases in this category
    const existingPhrases = await this.database.getPhrasesByCategory(category);
    console.log(`📋 Existing phrases in category: ${existingPhrases.length}`);
    
    if (existingPhrases.length >= targetCount) {
      console.log(`✅ Category "${category}" already has ${existingPhrases.length} phrases (target: ${targetCount})`);
      return;
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
        
        // Generate phrases with duplicate avoidance
        const result = await this.apiClient.generatePhrasesWithFallback(category, batchSize, currentPhrases);
        console.log(`📝 Generated ${result.phrases.length} phrases via ${result.service.toUpperCase()}`);
        
        // Process through quality pipeline
        const qualityResult = await this.qualityPipeline.processBatch(
          result.phrases, 
          category, 
          result.service
        );
        
        const stats = this.qualityPipeline.getBatchStatistics(qualityResult);
        console.log(`📊 Quality: ${stats.acceptanceRate}% accepted, avg score ${stats.averageScore}/100 (${stats.qualityGrade})`);
        
        // Store accepted phrases
        const acceptedPhrases = qualityResult.processed.filter(p => p.decision === 'accept');
        let storedCount = 0;
        
        for (const item of acceptedPhrases) {
          try {
            await this.database.addPhrase(item.phrase, category, { score: item.score });
            storedCount++;
            totalAccepted++;
            allScores.push(item.score);
            
            if (this.debug) {
              console.log(`  ✅ Stored: "${item.phrase}" (${item.score}/100)`);
            }
          } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
              if (this.debug) {
                console.log(`  ⚠️  Duplicate: "${item.phrase}"`);
              }
            } else {
              console.log(`  ❌ Failed: "${item.phrase}" - ${error.message}`);
            }
          }
        }
        
        console.log(`💾 Stored ${storedCount}/${acceptedPhrases.length} accepted phrases`);
        
        // Update running statistics
        this.stats.totalGenerated += result.phrases.length;
        this.stats.totalAccepted += acceptedPhrases.length;
        this.stats.totalStored += storedCount;
        this.stats.batchesCompleted = batch;
        
        // Brief pause between batches to be respectful to API
        if (batch < batchesNeeded) {
          console.log('⏸️  Pausing 3 seconds between batches...');
          await this.delay(3000);
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
    console.log(`   Average score: ${this.stats.averageScore}/100`);
    console.log(`   Batches completed: ${this.stats.batchesCompleted}`);
    
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
      console.log(`  ${i + 1}. "${phrase.phrase}" (${phrase.score}/100)`);
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
  
  if (!category) {
    console.log(`
Category Phrase Generator

Usage:
  node scripts/generate-category.js <category> [target-count] [--debug]

Examples:
  node scripts/generate-category.js "Movies & TV" 100
  node scripts/generate-category.js "Music & Artists" 100 --debug
  node scripts/generate-category.js "Sports & Athletes" 100

Categories:
  "Movies & TV"
  "Music & Artists" 
  "Sports & Athletes"
  "Food & Drink"
  "Places & Travel"
  "Famous People"
  "Entertainment & Pop Culture"
  "Technology & Science"
  "History & Events"
  "Nature & Animals"
  "Everything"
  "Everything+"
`);
    process.exit(1);
  }
  
  const generator = new CategoryGenerator({ debug });
  
  generator.generateForCategory(category, targetCount)
    .then(async (stats) => {
      console.log('\n✅ Generation session completed');
      
      // Show sample phrases
      await generator.showSamplePhrases(category);
      
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Generation failed:', error);
      process.exit(1);
    });
}

module.exports = CategoryGenerator; 