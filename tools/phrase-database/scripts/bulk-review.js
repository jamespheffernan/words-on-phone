#!/usr/bin/env node

/**
 * Bulk Review Tool - Interactive Phrase Review
 * 
 * Review phrases in the 40-69 score range requiring manual review
 * Target: Process 300 phrases in ≤30 minutes
 */

const PhraseDatabase = require('../src/database');
const config = require('../config');
const readline = require('readline');
const fs = require('fs-extra');
const path = require('path');

class BulkReviewTool {
  constructor(options = {}) {
    this.database = new PhraseDatabase();
    this.debug = options.debug || false;
    this.reviewQueue = [];
    this.currentIndex = 0;
    this.startTime = Date.now();
    this.stats = {
      approved: 0,
      rejected: 0,
      flagged: 0,
      total: 0
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async loadReviewQueue(category = null) {
    await this.database.initialize();
    
    let query = `
      SELECT id, phrase, category, score, source_provider, model_id, added 
      FROM phrases 
      WHERE score >= ? AND score < ?
    `;
    let params = [config.QUALITY_THRESHOLDS.manualReview, config.QUALITY_THRESHOLDS.autoAccept];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY added DESC';
    
    this.reviewQueue = await this.database.all(query, params);
    this.stats.total = this.reviewQueue.length;
    
    console.log(`\n📋 Loaded ${this.reviewQueue.length} phrases for review`);
    if (category) console.log(`📂 Category: ${category}`);
    console.log(`📊 Score range: ${config.QUALITY_THRESHOLDS.manualReview}-${config.QUALITY_THRESHOLDS.autoAccept - 1}`);
    
    return this.reviewQueue.length;
  }

  async startReview() {
    if (this.reviewQueue.length === 0) {
      console.log('🎉 No phrases need review!');
      return;
    }
    
    console.log('\n🚀 Starting Review Session');
    console.log('📖 Commands: [a]pprove [r]eject [f]lag [s]kip [b]atch+5 [q]uit [h]elp');
    console.log('='.repeat(60));
    
    this.startTime = Date.now();
    await this.reviewPhrase();
  }

  async reviewPhrase() {
    if (this.currentIndex >= this.reviewQueue.length) {
      await this.showStats();
      await this.cleanup();
      return;
    }
    
    const phrase = this.reviewQueue[this.currentIndex];
    const progress = Math.round((this.currentIndex / this.reviewQueue.length) * 100);
    
    console.log(`\n[${this.currentIndex + 1}/${this.reviewQueue.length}] ${progress}%`);
    console.log(`Phrase: "${phrase.phrase}"`);
    console.log(`Category: ${phrase.category} | Score: ${phrase.score}/100`);
    console.log(`Source: ${phrase.source_provider || 'unknown'}`);
    
    const answer = await this.askQuestion('Action [a/r/f/s/b/q/h]: ');
    
    switch (answer.toLowerCase()) {
      case 'a':
        await this.approvePhrase(phrase);
        break;
      case 'r':
        await this.rejectPhrase(phrase);
        break;
      case 'f':
        await this.flagPhrase(phrase);
        break;
      case 's':
        console.log('⏭️  Skipped');
        break;
      case 'b':
        await this.batchApprove(5);
        break;
      case 'q':
        await this.showStats();
        await this.cleanup();
        return;
      case 'h':
        this.showHelp();
        await this.reviewPhrase();
        return;
      case 'x':
        await this.exportCSV();
        await this.reviewPhrase();
        return;
      default:
        console.log('❌ Invalid input. Press h for help.');
        await this.reviewPhrase();
        return;
    }
    
    this.currentIndex++;
    await this.reviewPhrase();
  }

  async approvePhrase(phrase) {
    try {
      await this.database.run(
        'UPDATE phrases SET score = ? WHERE id = ?',
        [config.QUALITY_THRESHOLDS.autoAccept, phrase.id]
      );
      this.stats.approved++;
      console.log('✅ Approved');
    } catch (error) {
      console.log(`❌ Failed to approve: ${error.message}`);
    }
  }

  async rejectPhrase(phrase) {
    try {
      await this.database.run(
        'UPDATE phrases SET score = ? WHERE id = ?',
        [config.QUALITY_THRESHOLDS.autoReject - 1, phrase.id]
      );
      this.stats.rejected++;
      console.log('❌ Rejected');
    } catch (error) {
      console.log(`❌ Failed to reject: ${error.message}`);
    }
  }

  async flagPhrase(phrase) {
    try {
      await this.database.run(
        'UPDATE phrases SET score = ? WHERE id = ?',
        [45, phrase.id] // Flag score
      );
      this.stats.flagged++;
      console.log('🚩 Flagged');
    } catch (error) {
      console.log(`❌ Failed to flag: ${error.message}`);
    }
  }

  async batchApprove(count) {
    const endIndex = Math.min(this.currentIndex + count, this.reviewQueue.length);
    let approved = 0;
    
    for (let i = this.currentIndex; i < endIndex; i++) {
      try {
        await this.database.run(
          'UPDATE phrases SET score = ? WHERE id = ?',
          [config.QUALITY_THRESHOLDS.autoAccept, this.reviewQueue[i].id]
        );
        approved++;
        this.stats.approved++;
      } catch (error) {
        console.log(`❌ Failed to approve phrase ${i + 1}`);
      }
    }
    
    console.log(`✅ Batch approved ${approved} phrases`);
    this.currentIndex = endIndex - 1; // Will be incremented by main loop
  }

  async exportCSV() {
    const remaining = this.reviewQueue.slice(this.currentIndex);
    const csvPath = path.join(__dirname, '..', 'data', `review-export-${Date.now()}.csv`);
    
    const headers = ['id', 'phrase', 'category', 'score', 'source_provider', 'model_id'];
    const csvContent = [
      headers.join(','),
      ...remaining.map(p => [
        p.id,
        `"${p.phrase.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        p.score,
        p.source_provider || '',
        p.model_id || ''
      ].join(','))
    ].join('\n');
    
    try {
      await fs.writeFile(csvPath, csvContent);
      console.log(`📄 Exported ${remaining.length} phrases to: ${csvPath}`);
    } catch (error) {
      console.log(`❌ Export failed: ${error.message}`);
    }
  }

  showHelp() {
    console.log(`
📖 Review Commands:
  [a] Approve phrase (score → 70)
  [r] Reject phrase (score → 39)  
  [f] Flag for later review (score → 45)
  [s] Skip phrase (no change)
  [b] Batch approve next 5 phrases
  [x] Export remaining to CSV
  [q] Quit and show stats
  [h] Show this help

🎯 Target: 300 phrases in ≤30 minutes (10+ phrases/min)
`);
  }

  async showStats() {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const reviewed = this.stats.approved + this.stats.rejected + this.stats.flagged;
    const rate = reviewed > 0 ? (reviewed / elapsed) * 60 : 0;
    
    console.log('\n📊 Review Session Statistics:');
    console.log(`   Reviewed: ${reviewed}/${this.stats.total}`);
    console.log(`   Approved: ${this.stats.approved}`);
    console.log(`   Rejected: ${this.stats.rejected}`);
    console.log(`   Flagged: ${this.stats.flagged}`);
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Rate: ${rate.toFixed(1)} phrases/min`);
    
    if (rate >= 10) {
      console.log('✅ Excellent pace! (Target: 10+ phrases/min)');
    } else if (rate >= 6) {
      console.log('⚠️  Good pace (Target: 10+ phrases/min)');
    } else {
      console.log('❌ Slow pace - try batch operations');
    }
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async cleanup() {
    this.rl.close();
    await this.database.close();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = { debug: false };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
        showHelp();
        process.exit(0);
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--category':
        options.category = args[++i];
        break;
    }
  }
  
  try {
    const reviewer = new BulkReviewTool(options);
    const queueSize = await reviewer.loadReviewQueue(options.category);
    
    if (queueSize > 0) {
      await reviewer.startReview();
    } else {
      console.log('🎉 No phrases need review!');
      await reviewer.cleanup();
    }
  } catch (error) {
    console.error('❌ Review failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📋 Bulk Review Tool - Review phrases needing manual review (scores 40-69)

USAGE:
  node bulk-review.js [options]

OPTIONS:
  --help              Show this help
  --debug             Enable debug logging
  --category <name>   Review specific category only

EXAMPLES:
  node bulk-review.js                    # Review all pending phrases
  node bulk-review.js --category "Movies & TV"  # Review specific category

TARGET: Process 300 phrases in ≤30 minutes (10+ phrases/minute)
`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BulkReviewTool; 