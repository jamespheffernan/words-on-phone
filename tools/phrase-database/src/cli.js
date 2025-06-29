#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const PhraseDatabase = require('./database');
const RecencyTracker = require('./recencyTracker');
const QuotaTracker = require('./quotaTracker');
const DuplicateDetector = require('./duplicateDetector');
const PhraseScorer = require('./phraseScorer');
const PhraseNormalizer = require('./normalizer');
const GameExporter = require('./gameExporter');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

const program = new Command();

program
  .name('phrase-database')
  .description('CLI tool for managing phrase database with SQLite persistence')
  .version('1.0.0');

// Helper function to create progress bar
function createProgressBar(total) {
  let current = 0;
  return {
    update: (increment = 1) => {
      current += increment;
      const percentage = Math.round((current / total) * 100);
      const filled = Math.round((current / total) * 20);
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      process.stdout.write(`\r${bar} ${percentage}% (${current}/${total})`);
    },
    finish: () => {
      process.stdout.write('\n');
    }
  };
}

// Add phrase command
program
  .command('add')
  .description('Add phrases to the database')
  .option('-f, --file <path>', 'Import phrases from file (JSON/CSV)')
  .option('-c, --category <name>', 'Category for the phrases')
  .option('-i, --interactive', 'Interactive mode for adding phrases')
  .option('-r, --recent', 'Mark phrases as recent')
  .option('--force', 'Force add even if validation fails')
  .option('--dry-run', 'Preview what would be added without making changes')
  .action(async (options) => {
    try {
      const db = new PhraseDatabase();
      await db.initialize();
      
      const normalizer = new PhraseNormalizer();
      const duplicateDetector = new DuplicateDetector(db);
      const scorer = new PhraseScorer();
      const quotaTracker = new QuotaTracker(db);
      
      if (options.file) {
        // File import mode
        console.log(chalk.blue(`📂 Importing phrases from: ${options.file}`));
        
        const fileContent = await fs.readFile(options.file, 'utf8');
        let phrases = [];
        
        if (options.file.endsWith('.json')) {
          const data = JSON.parse(fileContent);
          if (Array.isArray(data)) {
            phrases = data.map(p => typeof p === 'string' ? { phrase: p, category: options.category } : p);
          } else if (data.phrases) {
            phrases = data.phrases;
          }
        } else if (options.file.endsWith('.csv')) {
          const lines = fileContent.split('\n').filter(line => line.trim());
          phrases = lines.map(line => {
            const [phrase, category] = line.split(',').map(s => s.trim());
            return { phrase, category: category || options.category };
          });
        }
        
        if (phrases.length === 0) {
          console.log(chalk.yellow('⚠️  No phrases found in file'));
          await db.close();
          return;
        }
        
        console.log(chalk.gray(`Found ${phrases.length} phrases to process`));
        
        if (options.dryRun) {
          console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made'));
        }
        
        const progressBar = createProgressBar(phrases.length);
        const results = { added: 0, skipped: 0, errors: 0 };
        
        for (const item of phrases) {
          try {
            if (!item.phrase || !item.category) {
              results.errors++;
              progressBar.update();
              continue;
            }
            
            // Normalize
            const normalized = normalizer.process(item.phrase);
            
            // Check duplicates
            const validation = await duplicateDetector.validatePhrase(item.phrase, item.category);
          if (!validation.valid) {
              results.skipped++;
              progressBar.update();
              continue;
            }
            
            // Check quota
            const quotaStatus = await quotaTracker.canAddPhrase(item.category);
            if (!quotaStatus.canAdd && !options.force) {
              results.skipped++;
              progressBar.update();
              continue;
            }
            
            // Score phrase (skip Reddit for faster import)
            const score = await scorer.scorePhrase(normalized.phrase, item.category, { skipReddit: true });
            
            if (score.totalScore < 20 && !options.force) {
              results.skipped++;
              progressBar.update();
              continue;
            }
            
            if (!options.dryRun) {
              await db.addPhrase(normalized.phrase, item.category, {
                recent: options.recent || false,
                score: score.totalScore,
                firstWord: normalized.firstWord
              });
            }
            
            results.added++;
          } catch (error) {
            results.errors++;
            logger.error(`Failed to add phrase "${item.phrase}": ${error.message}`);
          }
          
          progressBar.update();
        }
        
        progressBar.finish();
        
        console.log(chalk.green(`✅ Import complete!`));
        console.log(chalk.gray(`Added: ${results.added}, Skipped: ${results.skipped}, Errors: ${results.errors}`));
        
      } else if (options.interactive) {
        // Interactive mode
        console.log(chalk.blue('🎯 Interactive phrase addition mode'));
        console.log(chalk.gray('Type phrases one by one. Press Ctrl+C to exit.'));
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const askPhrase = () => {
          rl.question('Enter phrase: ', async (phrase) => {
            if (!phrase.trim()) {
              askPhrase();
              return;
            }
            
            try {
              const normalized = normalizer.process(phrase);
              const category = options.category || await new Promise((resolve) => {
                rl.question('Enter category: ', resolve);
              });
              
              const validation = await duplicateDetector.validatePhrase(phrase, category);
              if (!validation.valid) {
                console.log(chalk.yellow('⚠️  Phrase already exists or violates first-word limit'));
                askPhrase();
                return;
              }
              
              const score = await scorer.scorePhrase(normalized.phrase, category);
              console.log(chalk.gray(`Score: ${score.totalScore}/100`));
              
              if (!options.dryRun) {
                await db.addPhrase(normalized.phrase, category, {
                  recent: options.recent || false,
                  score: score.totalScore,
                  firstWord: normalized.firstWord
                });
              }
              
              console.log(chalk.green(`✅ Added: "${normalized.phrase}" to ${category}`));
            } catch (error) {
              console.log(chalk.red(`❌ Error: ${error.message}`));
            }
            
            askPhrase();
          });
        };
        
        askPhrase();
        
      } else {
        console.log(chalk.yellow('⚠️  Please specify --file, --interactive, or phrase text'));
        console.log(chalk.gray('Example: phrase-database add --file phrases.json --category "Movies & TV"'));
      }
      
      await db.close();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to add phrases:'), error.message);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate phrases for duplicates and quality')
  .option('-f, --file <path>', 'Validate phrases from file')
  .option('-c, --category <name>', 'Category for validation')
  .option('--threshold <number>', 'Minimum score threshold (default: 20)', '20')
  .action(async (options) => {
    try {
      const db = new PhraseDatabase();
      await db.initialize();
      
      const normalizer = new PhraseNormalizer();
      const duplicateDetector = new DuplicateDetector(db);
      const scorer = new PhraseScorer();
      
      let phrases = [];
      
      if (options.file) {
        const fileContent = await fs.readFile(options.file, 'utf8');
        if (options.file.endsWith('.json')) {
          const data = JSON.parse(fileContent);
          phrases = Array.isArray(data) ? data : data.phrases || [];
        } else {
          phrases = fileContent.split('\n').filter(line => line.trim());
        }
      } else {
        // Validate existing database
        const allPhrases = await db.getAllPhrases();
        phrases = allPhrases.map(p => ({ phrase: p.phrase, category: p.category }));
      }
      
      console.log(chalk.blue(`🔍 Validating ${phrases.length} phrases...`));
      
      const progressBar = createProgressBar(phrases.length);
      const results = { valid: 0, duplicates: 0, lowScore: 0, errors: 0 };
      const issues = [];
      
      for (const item of phrases) {
        try {
          const phrase = typeof item === 'string' ? item : item.phrase;
          const category = options.category || (typeof item === 'object' ? item.category : 'Unknown');
          
          const normalized = normalizer.process(phrase);
          
          // Check duplicates
          const validation = await duplicateDetector.validatePhrase(phrase, category);
          if (!validation.valid) {
            results.duplicates++;
            issues.push({ phrase, category, issue: 'Duplicate or first-word limit' });
            progressBar.update();
            continue;
          }
          
          // Score phrase
          const score = await scorer.scorePhrase(normalized.phrase, category);
          if (score.totalScore < parseInt(options.threshold)) {
            results.lowScore++;
            issues.push({ phrase, category, issue: `Low score: ${score.totalScore}`, score: score.totalScore });
            progressBar.update();
            continue;
          }
          
          results.valid++;
        } catch (error) {
          results.errors++;
          issues.push({ phrase: item.phrase || item, category: 'Unknown', issue: error.message });
        }
        
        progressBar.update();
      }
      
      progressBar.finish();
      
      console.log(chalk.green(`\n📊 Validation Results:`));
      console.log(chalk.green(`Valid: ${results.valid}`));
      console.log(chalk.yellow(`Duplicates: ${results.duplicates}`));
      console.log(chalk.red(`Low Score: ${results.lowScore}`));
      console.log(chalk.red(`Errors: ${results.errors}`));
      
      if (issues.length > 0 && issues.length <= 20) {
        console.log(chalk.blue('\n🚨 Issues Found:'));
        issues.forEach(issue => {
          console.log(chalk.gray(`  • "${issue.phrase}" (${issue.category}): ${issue.issue}`));
        });
      } else if (issues.length > 20) {
        console.log(chalk.blue(`\n🚨 ${issues.length} issues found (showing first 20):`));
        issues.slice(0, 20).forEach(issue => {
          console.log(chalk.gray(`  • "${issue.phrase}" (${issue.category}): ${issue.issue}`));
        });
      }
      
      await db.close();
      
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error.message);
      process.exit(1);
    }
  });

// Recency tracking commands
program
  .command('recency')
  .description('Manage phrase recency tracking')
  .addCommand(
    new Command('stats')
      .description('Show recency statistics')
      .option('-c, --category <name>', 'Show stats for specific category')
      .action(async (options) => {
        try {
          const db = new PhraseDatabase();
          await db.initialize();
          const tracker = new RecencyTracker(db);
          
          const stats = await tracker.getRecencyStats(options.category);
          
          console.log(chalk.blue('📈 Recency Statistics'));
          console.log(chalk.gray('='.repeat(40)));
          
          if (options.category) {
            const catStats = stats.categories.find(c => c.category === options.category);
            if (catStats) {
              console.log(chalk.green(`Category: ${catStats.category}`));
              console.log(chalk.gray(`Total: ${catStats.total}`));
              console.log(chalk.gray(`Recent: ${catStats.recent} (${catStats.percentage}%)`));
              console.log(chalk.gray(`Target: ${catStats.target}%`));
              console.log(chalk.gray(`Status: ${catStats.status}`));
            } else {
              console.log(chalk.yellow(`Category "${options.category}" not found`));
            }
          } else {
            console.log(chalk.green(`Overall: ${stats.overall.recent}/${stats.overall.total} (${stats.overall.percentage}%)`));
            console.log(chalk.gray(`Target: ${stats.overall.target}%\n`));
            
            console.log(chalk.blue('By Category:'));
            stats.categories.forEach(cat => {
              const statusColor = cat.status === 'GOOD' ? chalk.green : 
                                 cat.status === 'LOW' ? chalk.yellow : chalk.red;
              console.log(chalk.gray(`  ${cat.category}: ${cat.recent}/${cat.total} (${cat.percentage}%) `) + statusColor(cat.status));
            });
          }
          
          await db.close();
          
        } catch (error) {
          console.error(chalk.red('❌ Failed to get recency stats:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('mark')
      .description('Mark phrases as recent or classic')
      .argument('<type>', 'recent or classic')
      .option('-c, --category <name>', 'Mark all phrases in category')
      .option('-p, --phrase <text>', 'Mark specific phrase')
      .option('-f, --file <path>', 'Mark phrases from file')
      .option('--dry-run', 'Preview changes without applying')
      .action(async (type, options) => {
        try {
          if (!['recent', 'classic'].includes(type)) {
            console.log(chalk.red('❌ Type must be "recent" or "classic"'));
            process.exit(1);
          }
          
          const db = new PhraseDatabase();
          await db.initialize();
          const tracker = new RecencyTracker(db);
          
          const isRecent = type === 'recent';
          let phraseIds = [];
          
          if (options.phrase) {
            // Mark specific phrase
            const phrase = await db.db.get('SELECT id FROM phrases WHERE phrase = ?', [options.phrase]);
            if (phrase) {
              phraseIds = [phrase.id];
            } else {
              console.log(chalk.yellow(`⚠️  Phrase "${options.phrase}" not found`));
              await db.close();
              return;
            }
          } else if (options.category) {
            // Mark all phrases in category
            const phrases = await db.db.all('SELECT id FROM phrases WHERE category = ?', [options.category]);
            phraseIds = phrases.map(p => p.id);
          } else if (options.file) {
            // Mark phrases from file
            const fileContent = await fs.readFile(options.file, 'utf8');
            const phrases = fileContent.split('\n').filter(line => line.trim());
            
            for (const phrase of phrases) {
              const dbPhrase = await db.db.get('SELECT id FROM phrases WHERE phrase = ?', [phrase.trim()]);
              if (dbPhrase) {
                phraseIds.push(dbPhrase.id);
              }
            }
          } else {
            console.log(chalk.yellow('⚠️  Please specify --phrase, --category, or --file'));
            await db.close();
            return;
          }
          
          if (phraseIds.length === 0) {
            console.log(chalk.yellow('⚠️  No phrases found to mark'));
            await db.close();
            return;
          }
          
          console.log(chalk.blue(`🏷️  Marking ${phraseIds.length} phrases as ${type}...`));
          
          if (options.dryRun) {
            console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made'));
            console.log(chalk.gray(`Would mark ${phraseIds.length} phrases as ${type}`));
          } else {
            await tracker.markPhrasesRecency(phraseIds, isRecent);
            console.log(chalk.green(`✅ Marked ${phraseIds.length} phrases as ${type}`));
          }
          
          await db.close();
          
        } catch (error) {
          console.error(chalk.red('❌ Failed to mark phrases:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('detect')
      .description('Auto-detect recent phrases')
      .option('--dry-run', 'Preview detection without applying changes')
      .action(async (options) => {
        try {
          const db = new PhraseDatabase();
          await db.initialize();
          const tracker = new RecencyTracker(db);
          
          console.log(chalk.blue('🔍 Auto-detecting recent phrases...'));
          
          const results = await tracker.autoDetectRecent(options.dryRun);
          
          console.log(chalk.green(`✅ Detection complete!`));
          console.log(chalk.gray(`Found ${results.detectedCount} recent phrases`));
          
          if (results.detectedPhrases.length > 0 && results.detectedPhrases.length <= 10) {
            console.log(chalk.blue('\n📋 Detected phrases:'));
            results.detectedPhrases.forEach(phrase => {
              console.log(chalk.gray(`  • "${phrase.phrase}" (${phrase.category})`));
            });
          } else if (results.detectedPhrases.length > 10) {
            console.log(chalk.blue(`\n📋 Detected ${results.detectedPhrases.length} phrases (showing first 10):`));
            results.detectedPhrases.slice(0, 10).forEach(phrase => {
              console.log(chalk.gray(`  • "${phrase.phrase}" (${phrase.category})`));
            });
          }
          
          if (options.dryRun) {
            console.log(chalk.yellow('\n🔍 DRY RUN MODE - No changes were made'));
          }
          
          await db.close();
          
        } catch (error) {
          console.error(chalk.red('❌ Auto-detection failed:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('recommendations')
      .description('Get recency balance recommendations')
      .option('-c, --category <name>', 'Get recommendations for specific category')
      .action(async (options) => {
        try {
          const db = new PhraseDatabase();
          await db.initialize();
          const tracker = new RecencyTracker(db);
          
          const recommendations = await tracker.getRecencyRecommendations(options.category);
          
          console.log(chalk.blue('💡 Recency Recommendations'));
          console.log(chalk.gray('='.repeat(40)));
          
          if (recommendations.recommendations.length === 0) {
            console.log(chalk.green('✅ All categories are well balanced!'));
          } else {
            recommendations.recommendations.forEach(rec => {
              const actionColor = rec.action === 'add_recent' ? chalk.green : chalk.red;
              console.log(actionColor(`${rec.category}: ${rec.action.replace('_', ' ')} ${rec.count} phrases`));
              console.log(chalk.gray(`  Current: ${rec.current_percentage}%, Target: ${rec.target_percentage}%`));
            });
          }
          
          await db.close();
          
        } catch (error) {
          console.error(chalk.red('❌ Failed to get recommendations:'), error.message);
          process.exit(1);
        }
      })
  );

// Enhanced stats command
program
  .command('stats')
  .description('Show comprehensive database statistics')
  .option('-c, --category <name>', 'Show stats for specific category')
  .option('--recency', 'Include recency breakdown')
  .option('--quota', 'Include quota information')
  .option('--scores', 'Include score distribution')
  .action(async (options) => {
    try {
      const db = new PhraseDatabase();
      await db.initialize();
      
      console.log(chalk.blue('📊 Database Statistics'));
      console.log(chalk.gray('='.repeat(40)));
      
      const stats = await db.getStats();
      
      console.log(chalk.green(`Total Phrases: ${stats.total}`));
      console.log(chalk.yellow(`Recent Phrases: ${stats.recent} (${stats.recentPercentage}%)`));
      
      if (options.category) {
        const categoryStats = stats.categories.find(c => c.category === options.category);
        if (categoryStats) {
          console.log(chalk.blue(`\nCategory: ${categoryStats.category}`));
          console.log(chalk.gray(`  Phrases: ${categoryStats.count}`));
          
          if (options.recency) {
            const tracker = new RecencyTracker(db);
            const recencyStats = await tracker.getRecencyStats(options.category);
            const catRecency = recencyStats.categories.find(c => c.category === options.category);
            if (catRecency) {
              console.log(chalk.gray(`  Recent: ${catRecency.recent} (${catRecency.percentage}%)`));
              console.log(chalk.gray(`  Status: ${catRecency.status}`));
            }
          }
          
          if (options.quota) {
            const quotaTracker = new QuotaTracker(db);
            const quotaStatus = await quotaTracker.getCategoryStatus(options.category);
            console.log(chalk.gray(`  Quota: ${quotaStatus.current}/${quotaStatus.limit} (${quotaStatus.percentage}%)`));
            console.log(chalk.gray(`  Status: ${quotaStatus.status}`));
          }
        } else {
          console.log(chalk.yellow(`Category "${options.category}" not found`));
        }
      } else {
        if (stats.categories.length > 0) {
          console.log(chalk.blue('\nPhrases by Category:'));
          stats.categories.forEach(cat => {
            console.log(chalk.gray(`  ${cat.category}: ${cat.count}`));
          });
        }
        
        if (options.recency) {
          const tracker = new RecencyTracker(db);
          const recencyStats = await tracker.getRecencyStats();
          console.log(chalk.blue('\nRecency Breakdown:'));
          recencyStats.categories.forEach(cat => {
            const statusColor = cat.status === 'GOOD' ? chalk.green : 
                               cat.status === 'LOW' ? chalk.yellow : chalk.red;
            console.log(chalk.gray(`  ${cat.category}: ${cat.recent}/${cat.total} (${cat.percentage}%) `) + statusColor(cat.status));
          });
        }
        
        if (options.quota) {
          const quotaTracker = new QuotaTracker(db);
          const quotaReport = await quotaTracker.generateQuotaReport();
          console.log(chalk.blue('\nQuota Status:'));
          quotaReport.categories.forEach(cat => {
            const statusColor = cat.status === 'OK' ? chalk.green : 
                               cat.status === 'WARNING' ? chalk.yellow : chalk.red;
            console.log(chalk.gray(`  ${cat.category}: ${cat.current}/${cat.limit} (${cat.percentage}%) `) + statusColor(cat.status));
          });
        }
        
        if (options.scores) {
          const scoreDistribution = await db.db.all(`
            SELECT 
              CASE 
                WHEN score >= 80 THEN '80-100'
                WHEN score >= 60 THEN '60-79'
                WHEN score >= 40 THEN '40-59'
                WHEN score >= 20 THEN '20-39'
                ELSE '0-19'
              END as score_range,
              COUNT(*) as count
            FROM phrases 
            WHERE score IS NOT NULL
            GROUP BY score_range
            ORDER BY score_range DESC
          `);
          
          if (scoreDistribution.length > 0) {
            console.log(chalk.blue('\nScore Distribution:'));
            scoreDistribution.forEach(range => {
              console.log(chalk.gray(`  ${range.score_range}: ${range.count} phrases`));
            });
          }
        }
      }
      
      if (stats.categories.length === 0) {
        console.log(chalk.gray('\nNo phrases found. Run "init" to initialize the database.'));
      }
      
      await db.close();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to get statistics:'), error.message);
      process.exit(1);
    }
  });

// Export command
program
  .command('export')
  .description('Export phrases to various formats')
  .option('-o, --output <path>', 'Output file path', 'phrases-export.json')
  .option('-c, --category <name>', 'Export specific category only')
  .option('-f, --format <type>', 'Export format (json, csv, game)', 'json')
  .option('--recent-only', 'Export only recent phrases')
  .option('--min-score <number>', 'Minimum score threshold')
  .option('--backup', 'Create backup before export')
  .action(async (options) => {
    try {
      const db = new PhraseDatabase();
      await db.initialize();
      
      console.log(chalk.blue('📤 Exporting phrases...'));
      
      // Build query conditions
      let whereConditions = [];
      let params = [];
      
      if (options.category) {
        whereConditions.push('category = ?');
        params.push(options.category);
      }
      
      if (options.recentOnly) {
        whereConditions.push('recent = 1');
      }
      
      if (options.minScore) {
        whereConditions.push('score >= ?');
        params.push(parseInt(options.minScore));
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const query = `SELECT * FROM phrases ${whereClause} ORDER BY category, phrase`;
      
      const phrases = await db.db.all(query, params);
      
      if (phrases.length === 0) {
        console.log(chalk.yellow('⚠️  No phrases match the export criteria'));
        await db.close();
        return;
      }
      
      console.log(chalk.gray(`Found ${phrases.length} phrases to export`));
      
      // Create backup if requested
      if (options.backup) {
        const backupPath = `phrases-backup-${Date.now()}.json`;
        const allPhrases = await db.db.all('SELECT * FROM phrases ORDER BY category, phrase');
        await fs.writeFile(backupPath, JSON.stringify(allPhrases, null, 2));
        console.log(chalk.gray(`Backup created: ${backupPath}`));
      }
      
      let exportData;
      let outputPath = options.output;
      
      if (options.format === 'csv') {
        // CSV format
        const headers = 'phrase,category,recent,score,first_word';
        const rows = phrases.map(p => 
          `"${p.phrase}","${p.category}",${p.recent ? 'true' : 'false'},${p.score || ''},"${p.first_word || ''}"`
        );
        exportData = [headers, ...rows].join('\n');
        
        if (!outputPath.endsWith('.csv')) {
          outputPath = outputPath.replace(/\.[^.]+$/, '') + '.csv';
        }
        
      } else if (options.format === 'game') {
        // Game format (exact match to existing game structure)
        const gameExporter = new GameExporter(db);
        
        // Build game export options
        const gameOptions = {
          category: options.category || "Entertainment & Pop Culture",
          recentOnly: options.recentOnly,
          minScore: options.minScore ? parseInt(options.minScore) : undefined,
          shuffle: true // Default to shuffled for game use
        };
        
        // If specific category filter, use it
        if (options.category) {
          gameOptions.categories = [options.category];
        }
        
        const gameFormat = await gameExporter.exportGameFormat(gameOptions);
        
        // Validate the export
        const validation = gameExporter.validateGameFormat(gameFormat);
        if (!validation.valid) {
          console.log(chalk.red('❌ Export validation failed:'));
          validation.errors.forEach(error => {
            console.log(chalk.red(`  • ${error}`));
          });
          await db.close();
          return;
        }
        
        if (validation.warnings.length > 0) {
          console.log(chalk.yellow('⚠️  Export warnings:'));
          validation.warnings.forEach(warning => {
            console.log(chalk.yellow(`  • ${warning}`));
          });
        }
        
        exportData = JSON.stringify(gameFormat, null, 2);
        
        if (!outputPath.endsWith('.json')) {
          outputPath = outputPath.replace(/\.[^.]+$/, '') + '.json';
        }
        
      } else {
        // JSON format (full data)
        exportData = JSON.stringify(phrases, null, 2);
        
        if (!outputPath.endsWith('.json')) {
          outputPath = outputPath.replace(/\.[^.]+$/, '') + '.json';
        }
      }
      
      await fs.writeFile(outputPath, exportData);
      
      console.log(chalk.green(`✅ Export complete!`));
      console.log(chalk.gray(`File: ${outputPath}`));
      console.log(chalk.gray(`Format: ${options.format.toUpperCase()}`));
      console.log(chalk.gray(`Phrases: ${phrases.length}`));
      
      await db.close();
      
    } catch (error) {
      console.error(chalk.red('❌ Export failed:'), error.message);
      process.exit(1);
    }
  });

// Game export command
program
  .command('game-export')
  .description('Export phrases in exact game format')
  .option('-o, --output <path>', 'Output file path', 'game-phrases.json')
  .option('-c, --category <name>', 'Category name for the export', 'Entertainment & Pop Culture')
  .option('--categories <list>', 'Specific database categories to include (comma-separated)')
  .option('--recent-only', 'Export only recent phrases')
  .option('--min-score <number>', 'Minimum score threshold')
  .option('--max-score <number>', 'Maximum score threshold')
  .option('--limit <number>', 'Maximum number of phrases to export')
  .option('--no-shuffle', 'Don\'t shuffle phrases (keep alphabetical order)')
  .option('--backup', 'Create backup before export')
  .option('--validate', 'Validate export format (default: true)')
  .option('--stats', 'Show export statistics')
  .option('--multiple', 'Export each database category as separate game format')
  .action(async (options) => {
    try {
      const db = new PhraseDatabase();
      await db.initialize();
      const gameExporter = new GameExporter(db);
      
      console.log(chalk.blue('🎮 Exporting phrases in game format...'));
      
      // Create backup if requested
      if (options.backup) {
        const backup = await gameExporter.createBackup();
        console.log(chalk.gray(`Backup created: ${backup.path}`));
      }
      
      // Show stats if requested
      if (options.stats) {
        const stats = await gameExporter.getExportStats();
        console.log(chalk.blue('\n📊 Export Statistics:'));
        console.log(chalk.gray(`Total phrases: ${stats.total}`));
        console.log(chalk.gray(`Recent phrases: ${stats.recent} (${stats.recentPercentage}%)`));
        console.log(chalk.gray(`Average score: ${stats.scoreDistribution.average}`));
        console.log(chalk.gray(`Categories: ${stats.categories.length}`));
      }
      
      // Parse categories if provided
      let categoriesFilter = null;
      if (options.categories) {
        categoriesFilter = options.categories.split(',').map(cat => cat.trim());
      }
      
      // Build export options
      const exportOptions = {
        category: options.category,
        recentOnly: options.recentOnly,
        minScore: options.minScore ? parseInt(options.minScore) : undefined,
        maxScore: options.maxScore ? parseInt(options.maxScore) : undefined,
        limit: options.limit ? parseInt(options.limit) : undefined,
        shuffle: !options.noShuffle,
        categories: categoriesFilter
      };
      
      let exportData;
      let outputPath = options.output;
      
      if (options.multiple) {
        // Export multiple categories as separate game formats
        const gameFormats = await gameExporter.exportMultipleCategories(exportOptions);
        
        if (gameFormats.length === 0) {
          console.log(chalk.yellow('⚠️  No phrases found matching export criteria'));
          await db.close();
          return;
        }
        
        console.log(chalk.gray(`Found ${gameFormats.length} categories to export`));
        
        // Validate each format if requested
        if (options.validate !== false) {
          let allValid = true;
          gameFormats.forEach((gameFormat, index) => {
            const validation = gameExporter.validateGameFormat(gameFormat);
            if (!validation.valid) {
              console.log(chalk.red(`❌ Validation failed for category "${gameFormat.category}":`));
              validation.errors.forEach(error => {
                console.log(chalk.red(`  • ${error}`));
              });
              allValid = false;
            }
          });
          
          if (!allValid) {
            console.log(chalk.red('❌ Export validation failed'));
            await db.close();
            return;
          }
        }
        
        exportData = JSON.stringify(gameFormats, null, 2);
        
        if (!outputPath.endsWith('.json')) {
          outputPath = outputPath.replace(/\.[^.]+$/, '') + '.json';
        }
        
      } else {
        // Export single game format
        const gameFormat = await gameExporter.exportGameFormat(exportOptions);
        
        if (gameFormat.phrases.length === 0) {
          console.log(chalk.yellow('⚠️  No phrases found matching export criteria'));
          await db.close();
          return;
        }
        
        console.log(chalk.gray(`Found ${gameFormat.phrases.length} phrases to export`));
        
        // Validate export if requested
        if (options.validate !== false) {
          const validation = gameExporter.validateGameFormat(gameFormat);
          if (!validation.valid) {
            console.log(chalk.red('❌ Export validation failed:'));
            validation.errors.forEach(error => {
              console.log(chalk.red(`  • ${error}`));
            });
            await db.close();
            return;
          }
          
          if (validation.warnings.length > 0) {
            console.log(chalk.yellow('⚠️  Export warnings:'));
            validation.warnings.forEach(warning => {
              console.log(chalk.yellow(`  • ${warning}`));
            });
          }
        }
        
        exportData = JSON.stringify(gameFormat, null, 2);
        
        if (!outputPath.endsWith('.json')) {
          outputPath = outputPath.replace(/\.[^.]+$/, '') + '.json';
        }
      }
      
      // Write export file
      await fs.writeFile(outputPath, exportData);
      
      console.log(chalk.green(`✅ Game export complete!`));
      console.log(chalk.gray(`File: ${outputPath}`));
      console.log(chalk.gray(`Format: Game-compatible JSON`));
      
      if (options.multiple) {
        const gameFormats = JSON.parse(exportData);
        const totalPhrases = gameFormats.reduce((sum, gf) => sum + gf.phrases.length, 0);
        console.log(chalk.gray(`Categories: ${gameFormats.length}`));
        console.log(chalk.gray(`Total phrases: ${totalPhrases}`));
      } else {
        const gameFormat = JSON.parse(exportData);
        console.log(chalk.gray(`Category: ${gameFormat.category}`));
        console.log(chalk.gray(`Phrases: ${gameFormat.phrases.length}`));
      }
      
      await db.close();
      
    } catch (error) {
      console.error(chalk.red('❌ Game export failed:'), error.message);
      process.exit(1);
    }
  });

// Interactive review mode
program
  .command('review')
  .description('Interactive phrase review and management')
  .option('-c, --category <name>', 'Review specific category')
  .option('--low-scores', 'Review only low-scoring phrases')
  .option('--unrecent', 'Review non-recent phrases')
  .action(async (options) => {
    try {
      const db = new PhraseDatabase();
      await db.initialize();
      
      console.log(chalk.blue('🔍 Interactive Phrase Review'));
      console.log(chalk.gray('Commands: (a)ccept, (d)elete, (r)ecent, (c)lassic, (s)core, (n)ext, (q)uit'));
      console.log(chalk.gray('='.repeat(60)));
      
      // Build query for phrases to review
      let whereConditions = [];
      let params = [];
      
      if (options.category) {
        whereConditions.push('category = ?');
        params.push(options.category);
      }
      
      if (options.lowScores) {
        whereConditions.push('score < 40');
      }
      
      if (options.unrecent) {
        whereConditions.push('recent = 0');
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const query = `SELECT * FROM phrases ${whereClause} ORDER BY RANDOM()`;
      
      const phrases = await db.db.all(query, params);
      
      if (phrases.length === 0) {
        console.log(chalk.yellow('⚠️  No phrases found for review'));
        await db.close();
        return;
      }
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      let currentIndex = 0;
      const scorer = new PhraseScorer();
      
      const reviewPhrase = async () => {
        if (currentIndex >= phrases.length) {
          console.log(chalk.green('\n✅ Review complete!'));
          rl.close();
          await db.close();
          return;
        }
        
        const phrase = phrases[currentIndex];
        
        console.log(chalk.blue(`\n[${currentIndex + 1}/${phrases.length}] "${phrase.phrase}"`));
        console.log(chalk.gray(`Category: ${phrase.category}`));
        console.log(chalk.gray(`Recent: ${phrase.recent ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`Score: ${phrase.score || 'N/A'}`));
        console.log(chalk.gray(`First Word: ${phrase.first_word || 'N/A'}`));
        
        rl.question('\nAction: ', async (action) => {
          try {
            switch (action.toLowerCase()) {
              case 'a':
              case 'accept':
                console.log(chalk.green('✅ Accepted'));
                break;
                
              case 'd':
              case 'delete':
                await db.db.run('DELETE FROM phrases WHERE id = ?', [phrase.id]);
                console.log(chalk.red('🗑️  Deleted'));
                break;
                
              case 'r':
              case 'recent':
                await db.db.run('UPDATE phrases SET recent = 1 WHERE id = ?', [phrase.id]);
                console.log(chalk.yellow('🕐 Marked as recent'));
                break;
                
              case 'c':
              case 'classic':
                await db.db.run('UPDATE phrases SET recent = 0 WHERE id = ?', [phrase.id]);
                console.log(chalk.gray('📚 Marked as classic'));
                break;
                
              case 's':
              case 'score':
                const newScore = await scorer.scorePhrase(phrase.phrase, phrase.category);
                await db.db.run('UPDATE phrases SET score = ? WHERE id = ?', [newScore.totalScore, phrase.id]);
                console.log(chalk.blue(`📊 Rescored: ${newScore.totalScore}`));
                break;
                
              case 'q':
              case 'quit':
                console.log(chalk.yellow('👋 Goodbye!'));
                rl.close();
                await db.close();
                return;
                
              case 'n':
              case 'next':
              default:
                console.log(chalk.gray('➡️  Next'));
                break;
            }
            
            currentIndex++;
            reviewPhrase();
            
          } catch (error) {
            console.log(chalk.red(`❌ Error: ${error.message}`));
            reviewPhrase();
          }
        });
      };
      
      reviewPhrase();
      
    } catch (error) {
      console.error(chalk.red('❌ Review failed:'), error.message);
      process.exit(1);
    }
  });

// Initialize database command
program
  .command('init')
  .description('Initialize the phrase database')
  .action(async () => {
    try {
      console.log(chalk.blue('🚀 Initializing phrase database...'));
      
      const db = new PhraseDatabase();
      await db.initialize();
      
      // Add some default categories
      const defaultCategories = [
        { name: 'Movies & TV', description: 'Movies, TV shows, and entertainment', quota: 1000 },
        { name: 'Sports', description: 'Sports teams, players, and activities', quota: 600 },
        { name: 'Music', description: 'Songs, artists, and musical terms', quota: 800 },
        { name: 'Food & Drink', description: 'Foods, beverages, and cooking', quota: 500 },
        { name: 'Animals', description: 'Animals, pets, and wildlife', quota: 400 },
        { name: 'Places', description: 'Cities, countries, and landmarks', quota: 500 },
        { name: 'Books & Literature', description: 'Books, authors, and literary works', quota: 300 },
        { name: 'Science & Technology', description: 'Scientific concepts and technology', quota: 400 }
      ];

      for (const category of defaultCategories) {
        await db.addCategory(category.name, category.description, category.quota);
      }

      await db.close();
      
      console.log(chalk.green('✅ Database initialized successfully!'));
      console.log(chalk.gray('Default categories added:'));
      defaultCategories.forEach(cat => {
        console.log(chalk.gray(`  • ${cat.name} (quota: ${cat.quota})`));
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize database:'), error.message);
      process.exit(1);
    }
  });

// Bulk review command  
program
  .command('bulk-review')
  .description('Start bulk review session for phrases needing manual review (scores 40-69)')
  .option('-c, --category <name>', 'Review specific category only')
  .option('--debug', 'Enable debug logging')
  .option('--export <path>', 'Export phrases to CSV instead of reviewing')
  .option('--import <path>', 'Import reviewed phrases from CSV')
  .action(async (options) => {
    const BulkReviewTool = require('../scripts/bulk-review');
    
    try {
      const reviewer = new BulkReviewTool(options);
      
      if (options.import) {
        // Import CSV reviews
        await reviewer.database.initialize();
        console.log(chalk.blue(`📄 Importing reviews from: ${options.import}`));
        // TODO: Implement CSV import
        console.log(chalk.yellow('⚠️  CSV import not yet implemented'));
        await reviewer.cleanup();
        return;
      }
      
      const queueSize = await reviewer.loadReviewQueue(options.category);
      
      if (options.export) {
        // Export to CSV
        if (queueSize > 0) {
          await reviewer.exportCSV();
          console.log(chalk.green(`📄 Exported ${queueSize} phrases for review`));
        } else {
          console.log(chalk.yellow('📄 No phrases need review - nothing to export'));
        }
        await reviewer.cleanup();
        return;
      }
      
      if (queueSize > 0) {
        console.log(chalk.blue(`\n📋 Found ${queueSize} phrases needing review (scores 40-69)`));
        console.log(chalk.gray('💡 TIP: Use batch operations [b] for efficiency!'));
        console.log(chalk.gray('🎯 TARGET: 10+ phrases per minute\n'));
        
        await reviewer.startReview();
      } else {
        console.log(chalk.green('🎉 No phrases need review!'));
        await reviewer.cleanup();
      }
    } catch (error) {
      console.error(chalk.red('❌ Bulk review failed:'), error.message);
      if (options.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse(); 