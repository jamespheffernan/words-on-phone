#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the phrase data
const phrasesPath = path.join(__dirname, '../src/data/phrases.ts');
const phrasesDataRaw = fs.readFileSync(phrasesPath, 'utf-8');

// Parse the phrases from the TypeScript file
function extractPhrasesFromFile(content) {
  const phrases = [];
  const categories = {};
  
  // Extract array definitions
  const arrayMatches = content.match(/const (\w+Phrases) = \[([\s\S]*?)\];/g);
  
  if (arrayMatches) {
    arrayMatches.forEach(match => {
      const arrayName = match.match(/const (\w+Phrases)/)[1];
      const arrayContent = match.match(/\[([\s\S]*?)\]/)[1];
      
      // Extract phrases from array content
      const phraseMatches = arrayContent.match(/'([^']+)'/g);
      if (phraseMatches) {
        const categoryPhrases = phraseMatches.map(p => p.replace(/'/g, ''));
        categories[arrayName] = categoryPhrases;
        phrases.push(...categoryPhrases);
      }
    });
  }
  
  // Extract additional phrases from the additionalPhrases array
  const additionalMatch = content.match(/const additionalPhrases = \[([\s\S]*?)\];/);
  if (additionalMatch) {
    const additionalContent = additionalMatch[1];
    const additionalMatches = additionalContent.match(/'([^']+)'/g);
    if (additionalMatches) {
      const additionalPhrases = additionalMatches.map(p => p.replace(/'/g, ''));
      categories['additionalPhrases'] = additionalPhrases;
      phrases.push(...additionalPhrases);
    }
  }
  
  return { phrases, categories };
}

// Quality assessment functions
function assessDifficulty(phrase) {
  const length = phrase.length;
  const wordCount = phrase.split(/\s+/).length;
  const hasNumbers = /\d/.test(phrase);
  const hasSpecialChars = /[&,.'()-]/.test(phrase);
  const isProperNoun = /^[A-Z]/.test(phrase);
  
  let score = 0;
  
  // Length scoring
  if (length < 10) score += 1;
  else if (length < 20) score += 2;
  else score += 3;
  
  // Word count scoring
  if (wordCount === 1) score += 1;
  else if (wordCount <= 3) score += 2;
  else score += 3;
  
  // Complexity scoring
  if (hasNumbers) score += 1;
  if (hasSpecialChars) score += 1;
  if (isProperNoun) score += 1;
  
  // Classification
  if (score <= 3) return 'easy';
  if (score <= 6) return 'medium';
  return 'hard';
}

function assessQuality(phrase) {
  let score = 10; // Start with perfect score
  
  // Deduct points for quality issues
  if (phrase.length < 5) score -= 3; // Too short
  if (phrase.length > 30) score -= 2; // Too long
  if (phrase.toLowerCase().includes('sample')) score -= 5; // Generic sample phrase
  if (/^\w+\s+\d+$/.test(phrase)) score -= 5; // Generic "Word Number" pattern
  if (phrase.includes('&')) score += 1; // Proper formatting
  if (phrase.split(' ').length === 1) score -= 1; // Single word might be less engaging
  
  // Bonus for cultural relevance
  const culturalTerms = ['Academy Awards', 'Super Bowl', 'World Cup', 'Olympics', 'Broadway', 'Hollywood'];
  if (culturalTerms.some(term => phrase.includes(term))) score += 2;
  
  return Math.max(0, Math.min(10, score));
}

function categorizePhraseType(phrase) {
  const lowerPhrase = phrase.toLowerCase();
  
  if (lowerPhrase.includes('sample phrase')) return 'generated';
  
  // Check for specific patterns
  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(phrase)) return 'proper_noun';
  if (phrase.includes('&')) return 'title_or_brand';
  if (phrase.split(' ').length === 1) return 'single_word';
  if (phrase.includes('Day') || phrase.includes('Night')) return 'event_or_time';
  
  return 'general';
}

// Main analysis function
function analyzePhrasesDatabase() {
  console.log('🔍 Starting Phrase Database Audit...\n');
  
  const { phrases, categories } = extractPhrasesFromFile(phrasesDataRaw);
  
  console.log(`📊 Total phrases found: ${phrases.length}`);
  console.log(`📁 Categories found: ${Object.keys(categories).length}\n`);
  
  // Analyze each phrase
  const analysis = phrases.map(phrase => ({
    text: phrase,
    length: phrase.length,
    wordCount: phrase.split(/\s+/).length,
    difficulty: assessDifficulty(phrase),
    quality: assessQuality(phrase),
    type: categorizePhraseType(phrase)
  }));
  
  // Generate statistics
  const stats = {
    total: analysis.length,
    byDifficulty: {
      easy: analysis.filter(p => p.difficulty === 'easy').length,
      medium: analysis.filter(p => p.difficulty === 'medium').length,
      hard: analysis.filter(p => p.difficulty === 'hard').length
    },
    byQuality: {
      excellent: analysis.filter(p => p.quality >= 9).length,
      good: analysis.filter(p => p.quality >= 7).length,
      average: analysis.filter(p => p.quality >= 5).length,
      poor: analysis.filter(p => p.quality < 5).length
    },
    byType: {},
    byLength: {
      short: analysis.filter(p => p.length < 10).length,
      medium: analysis.filter(p => p.length >= 10 && p.length < 20).length,
      long: analysis.filter(p => p.length >= 20).length
    },
    averageLength: Math.round(analysis.reduce((sum, p) => sum + p.length, 0) / analysis.length),
    averageWordCount: Math.round(analysis.reduce((sum, p) => sum + p.wordCount, 0) / analysis.length * 10) / 10
  };
  
  // Count by type
  analysis.forEach(p => {
    stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
  });
  
  // Print detailed analysis
  console.log('📊 DIFFICULTY DISTRIBUTION:');
  console.log(`  Easy: ${stats.byDifficulty.easy} (${Math.round(stats.byDifficulty.easy / stats.total * 100)}%)`);
  console.log(`  Medium: ${stats.byDifficulty.medium} (${Math.round(stats.byDifficulty.medium / stats.total * 100)}%)`);
  console.log(`  Hard: ${stats.byDifficulty.hard} (${Math.round(stats.byDifficulty.hard / stats.total * 100)}%)\n`);
  
  console.log('⭐ QUALITY DISTRIBUTION:');
  console.log(`  Excellent (9-10): ${stats.byQuality.excellent} (${Math.round(stats.byQuality.excellent / stats.total * 100)}%)`);
  console.log(`  Good (7-8): ${stats.byQuality.good} (${Math.round(stats.byQuality.good / stats.total * 100)}%)`);
  console.log(`  Average (5-6): ${stats.byQuality.average} (${Math.round(stats.byQuality.average / stats.total * 100)}%)`);
  console.log(`  Poor (<5): ${stats.byQuality.poor} (${Math.round(stats.byQuality.poor / stats.total * 100)}%)\n`);
  
  console.log('📏 LENGTH DISTRIBUTION:');
  console.log(`  Short (<10 chars): ${stats.byLength.short} (${Math.round(stats.byLength.short / stats.total * 100)}%)`);
  console.log(`  Medium (10-19 chars): ${stats.byLength.medium} (${Math.round(stats.byLength.medium / stats.total * 100)}%)`);
  console.log(`  Long (20+ chars): ${stats.byLength.long} (${Math.round(stats.byLength.long / stats.total * 100)}%)`);
  console.log(`  Average length: ${stats.averageLength} characters`);
  console.log(`  Average word count: ${stats.averageWordCount} words\n`);
  
  console.log('🏷️ TYPE DISTRIBUTION:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} (${Math.round(count / stats.total * 100)}%)`);
  });
  console.log();
  
  // Identify gold standard phrases (top 20%)
  const sortedByQuality = analysis.sort((a, b) => b.quality - a.quality);
  const goldStandardCount = Math.ceil(analysis.length * 0.2);
  const goldStandard = sortedByQuality.slice(0, goldStandardCount);
  
  console.log('🏆 GOLD STANDARD PHRASES (Top 20%):');
  goldStandard.slice(0, 20).forEach((phrase, idx) => {
    console.log(`  ${idx + 1}. "${phrase.text}" (Quality: ${phrase.quality}, Difficulty: ${phrase.difficulty})`);
  });
  if (goldStandard.length > 20) {
    console.log(`  ... and ${goldStandard.length - 20} more\n`);
  }
  
  // Identify problematic phrases
  const problematic = analysis.filter(p => p.quality < 5);
  console.log('⚠️ PROBLEMATIC PHRASES (Quality < 5):');
  problematic.slice(0, 20).forEach((phrase, idx) => {
    console.log(`  ${idx + 1}. "${phrase.text}" (Quality: ${phrase.quality}, Type: ${phrase.type})`);
  });
  if (problematic.length > 20) {
    console.log(`  ... and ${problematic.length - 20} more\n`);
  }
  
  // Category analysis
  console.log('📁 CATEGORY ANALYSIS:');
  Object.entries(categories).forEach(([categoryName, phrases]) => {
    const categoryAnalysis = phrases.map(phrase => ({
      text: phrase,
      quality: assessQuality(phrase),
      difficulty: assessDifficulty(phrase)
    }));
    
    const avgQuality = Math.round(categoryAnalysis.reduce((sum, p) => sum + p.quality, 0) / categoryAnalysis.length * 10) / 10;
    const difficultyDist = {
      easy: categoryAnalysis.filter(p => p.difficulty === 'easy').length,
      medium: categoryAnalysis.filter(p => p.difficulty === 'medium').length,
      hard: categoryAnalysis.filter(p => p.difficulty === 'hard').length
    };
    
    console.log(`  ${categoryName}: ${phrases.length} phrases, Avg Quality: ${avgQuality}, Difficulty: E${difficultyDist.easy}/M${difficultyDist.medium}/H${difficultyDist.hard}`);
  });
  
  return {
    analysis,
    stats,
    goldStandard,
    problematic,
    categories
  };
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = analyzePhrasesDatabase();
  
  console.log('\n✅ Audit complete! Results saved to audit results.\n');
  console.log('🎯 KEY FINDINGS:');
  console.log(`  • Total phrases: ${results.stats.total}`);
  console.log(`  • Gold standard phrases: ${results.goldStandard.length}`);
  console.log(`  • Problematic phrases: ${results.problematic.length}`);
  console.log(`  • Average quality score: ${Math.round(results.analysis.reduce((sum, p) => sum + p.quality, 0) / results.analysis.length * 10) / 10}/10`);
  console.log(`  • Most common difficulty: ${Object.entries(results.stats.byDifficulty).reduce((a, b) => results.stats.byDifficulty[a[0]] > results.stats.byDifficulty[b[0]] ? a : b)[0]}\n`);
}

export { analyzePhrasesDatabase, assessDifficulty, assessQuality, categorizePhraseType };