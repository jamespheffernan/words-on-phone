#!/usr/bin/env node

/**
 * Analyze Provider Quality Script
 * 
 * Analyzes phrase generation quality by AI provider and model.
 * Outputs metrics for comparing OpenAI vs Gemini performance.
 */

const path = require('path');
const PhraseDatabase = require('../src/database');

class ProviderQualityAnalyzer {
  constructor() {
    this.db = new PhraseDatabase();
  }

  async initialize() {
    await this.db.initialize();
  }

  async analyzeProviderQuality() {
    console.log('🔍 Analyzing Provider Quality...\n');

    // Get all phrases with provider attribution
    const phrases = await this.db.all(`
      SELECT 
        phrase,
        category,
        score,
        source_provider,
        model_id,
        added
      FROM phrases 
      WHERE source_provider IS NOT NULL
      ORDER BY added DESC
    `);

    if (phrases.length === 0) {
      console.log('❌ No phrases with provider attribution found.');
      console.log('   Generate some phrases first using the updated API client.');
      return;
    }

    console.log(`📊 Found ${phrases.length} phrases with provider attribution\n`);

    // Group by provider
    const byProvider = this.groupBy(phrases, 'source_provider');
    
    // Group by model
    const byModel = this.groupBy(phrases, 'model_id');

    // Group by provider + model
    const byProviderModel = this.groupBy(phrases, p => `${p.source_provider}/${p.model_id}`);

    // Overall statistics
    this.printOverallStats(phrases);
    
    // Provider comparison
    this.printProviderComparison(byProvider);
    
    // Model comparison
    this.printModelComparison(byModel);
    
    // Provider + Model breakdown
    this.printProviderModelBreakdown(byProviderModel);
    
    // Category performance by provider
    this.printCategoryPerformance(phrases);
    
    // Quality distribution
    this.printQualityDistribution(phrases);

    await this.db.close();
  }

  groupBy(array, keyFn) {
    const key = typeof keyFn === 'string' ? (item) => item[keyFn] : keyFn;
    return array.reduce((groups, item) => {
      const groupKey = key(item);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {});
  }

  calculateStats(phrases) {
    if (phrases.length === 0) return null;
    
    const scores = phrases.map(p => p.score).filter(s => s !== null && s !== undefined);
    const validScores = scores.filter(s => s > 0);
    
    if (validScores.length === 0) {
      return {
        count: phrases.length,
        avgScore: 0,
        minScore: 0,
        maxScore: 0,
        acceptanceRate: 0,
        qualityGrades: { excellent: 0, good: 0, fair: 0, poor: 0 }
      };
    }

    const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const minScore = Math.min(...validScores);
    const maxScore = Math.max(...validScores);
    
    // Quality grades based on score thresholds
    const excellent = validScores.filter(s => s >= 80).length;
    const good = validScores.filter(s => s >= 60 && s < 80).length;
    const fair = validScores.filter(s => s >= 40 && s < 60).length;
    const poor = validScores.filter(s => s < 40).length;
    
    return {
      count: phrases.length,
      avgScore: Math.round(avgScore * 10) / 10,
      minScore,
      maxScore,
      acceptanceRate: Math.round(validScores.length / phrases.length * 100),
      qualityGrades: { excellent, good, fair, poor }
    };
  }

  printOverallStats(phrases) {
    const stats = this.calculateStats(phrases);
    
    console.log('📈 OVERALL STATISTICS');
    console.log('=====================');
    console.log(`Total Phrases: ${stats.count}`);
    console.log(`Average Score: ${stats.avgScore}/100`);
    console.log(`Score Range: ${stats.minScore} - ${stats.maxScore}`);
    console.log(`Acceptance Rate: ${stats.acceptanceRate}%`);
    console.log(`Quality Distribution:`);
    console.log(`  🟢 Excellent (80+): ${stats.qualityGrades.excellent} (${Math.round(stats.qualityGrades.excellent/stats.count*100)}%)`);
    console.log(`  🟡 Good (60-79): ${stats.qualityGrades.good} (${Math.round(stats.qualityGrades.good/stats.count*100)}%)`);
    console.log(`  🟠 Fair (40-59): ${stats.qualityGrades.fair} (${Math.round(stats.qualityGrades.fair/stats.count*100)}%)`);
    console.log(`  🔴 Poor (<40): ${stats.qualityGrades.poor} (${Math.round(stats.qualityGrades.poor/stats.count*100)}%)`);
    console.log('');
  }

  printProviderComparison(byProvider) {
    console.log('🤖 PROVIDER COMPARISON');
    console.log('======================');
    
    const providers = Object.keys(byProvider).sort();
    
    for (const provider of providers) {
      const stats = this.calculateStats(byProvider[provider]);
      const emoji = provider === 'openai' ? '🤖' : '✨';
      
      console.log(`${emoji} ${provider.toUpperCase()}`);
      console.log(`   Phrases: ${stats.count}`);
      console.log(`   Avg Score: ${stats.avgScore}/100`);
      console.log(`   Range: ${stats.minScore}-${stats.maxScore}`);
      console.log(`   Quality: ${stats.qualityGrades.excellent}🟢 ${stats.qualityGrades.good}🟡 ${stats.qualityGrades.fair}🟠 ${stats.qualityGrades.poor}🔴`);
      console.log('');
    }
  }

  printModelComparison(byModel) {
    console.log('🔧 MODEL COMPARISON');
    console.log('===================');
    
    const models = Object.keys(byModel).sort();
    
    for (const model of models) {
      const stats = this.calculateStats(byModel[model]);
      
      console.log(`📱 ${model || 'Unknown Model'}`);
      console.log(`   Phrases: ${stats.count}`);
      console.log(`   Avg Score: ${stats.avgScore}/100`);
      console.log(`   Range: ${stats.minScore}-${stats.maxScore}`);
      console.log(`   Quality: ${stats.qualityGrades.excellent}🟢 ${stats.qualityGrades.good}🟡 ${stats.qualityGrades.fair}🟠 ${stats.qualityGrades.poor}🔴`);
      console.log('');
    }
  }

  printProviderModelBreakdown(byProviderModel) {
    console.log('🔬 PROVIDER + MODEL BREAKDOWN');
    console.log('==============================');
    
    const combinations = Object.keys(byProviderModel).sort();
    
    for (const combo of combinations) {
      const stats = this.calculateStats(byProviderModel[combo]);
      
      console.log(`⚙️  ${combo}`);
      console.log(`   Phrases: ${stats.count}`);
      console.log(`   Avg Score: ${stats.avgScore}/100`);
      console.log(`   Quality: ${stats.qualityGrades.excellent}🟢 ${stats.qualityGrades.good}🟡 ${stats.qualityGrades.fair}🟠 ${stats.qualityGrades.poor}🔴`);
      console.log('');
    }
  }

  printCategoryPerformance(phrases) {
    console.log('📂 CATEGORY PERFORMANCE BY PROVIDER');
    console.log('====================================');
    
    const byCategory = this.groupBy(phrases, 'category');
    const categories = Object.keys(byCategory).sort();
    
    for (const category of categories) {
      console.log(`📁 ${category}`);
      
      const categoryPhrases = byCategory[category];
      const byProvider = this.groupBy(categoryPhrases, 'source_provider');
      
      for (const provider of Object.keys(byProvider).sort()) {
        const stats = this.calculateStats(byProvider[provider]);
        const emoji = provider === 'openai' ? '🤖' : '✨';
        
        console.log(`   ${emoji} ${provider}: ${stats.count} phrases, ${stats.avgScore} avg`);
      }
      console.log('');
    }
  }

  printQualityDistribution(phrases) {
    console.log('📊 QUALITY SCORE DISTRIBUTION');
    console.log('==============================');
    
    const scoreRanges = {
      '90-100': phrases.filter(p => p.score >= 90).length,
      '80-89': phrases.filter(p => p.score >= 80 && p.score < 90).length,
      '70-79': phrases.filter(p => p.score >= 70 && p.score < 80).length,
      '60-69': phrases.filter(p => p.score >= 60 && p.score < 70).length,
      '50-59': phrases.filter(p => p.score >= 50 && p.score < 60).length,
      '40-49': phrases.filter(p => p.score >= 40 && p.score < 50).length,
      '30-39': phrases.filter(p => p.score >= 30 && p.score < 40).length,
      '20-29': phrases.filter(p => p.score >= 20 && p.score < 30).length,
      '10-19': phrases.filter(p => p.score >= 10 && p.score < 20).length,
      '0-9': phrases.filter(p => p.score >= 0 && p.score < 10).length,
    };
    
    for (const [range, count] of Object.entries(scoreRanges)) {
      if (count > 0) {
        const percentage = Math.round(count / phrases.length * 100);
        const bar = '█'.repeat(Math.max(1, Math.round(percentage / 5)));
        console.log(`${range}: ${count.toString().padStart(3)} phrases (${percentage.toString().padStart(2)}%) ${bar}`);
      }
    }
    console.log('');
  }

  async close() {
    await this.db.close();
  }
}

// CLI execution
async function main() {
  const analyzer = new ProviderQualityAnalyzer();
  
  try {
    await analyzer.initialize();
    await analyzer.analyzeProviderQuality();
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ProviderQualityAnalyzer; 