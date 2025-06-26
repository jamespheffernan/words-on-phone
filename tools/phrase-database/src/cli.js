#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const winston = require('winston');
const PhraseDatabase = require('./database');
const PhraseNormalizer = require('./normalizer');
const DuplicateDetector = require('./duplicateDetector');
const CommonPhraseDetector = require('./commonPhraseDetector');

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

// Add phrase command
program
  .command('add')
  .description('Add phrases to the database')
  .option('-f, --file <path>', 'Import phrases from file (JSON/CSV)')
  .option('-c, --category <name>', 'Category for the phrases')
  .option('-i, --interactive', 'Interactive mode for adding phrases')
  .action((options) => {
    console.log(chalk.blue('🔧 Add command - Coming soon!'));
    console.log('Options:', options);
  });

// Stats command
program
  .command('stats')
  .description('Show database statistics')
  .action(async () => {
    try {
      const db = new PhraseDatabase();
      await db.initialize();
      
      console.log(chalk.blue('📊 Database Statistics'));
      console.log(chalk.gray('='.repeat(40)));
      
      const stats = await db.getStats();
      
      console.log(chalk.green(`Total Phrases: ${stats.total}`));
      console.log(chalk.yellow(`Recent Phrases: ${stats.recent} (${stats.recentPercentage}%)`));
      
      if (stats.categories.length > 0) {
        console.log(chalk.blue('\nPhrases by Category:'));
        stats.categories.forEach(cat => {
          console.log(chalk.gray(`  ${cat.category}: ${cat.count}`));
        });
      } else {
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
  .description('Export phrases to JSON format')
  .option('-o, --output <path>', 'Output file path', 'phrases-export.json')
  .option('-c, --category <name>', 'Export specific category only')
  .action((options) => {
    console.log(chalk.blue('📤 Export command - Coming soon!'));
    console.log('Options:', options);
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
        { name: 'Movies & TV', description: 'Movies, TV shows, and entertainment', quota: 100 },
        { name: 'Sports', description: 'Sports teams, players, and activities', quota: 100 },
        { name: 'Music', description: 'Songs, artists, and musical terms', quota: 100 },
        { name: 'Food & Drink', description: 'Foods, beverages, and cooking', quota: 100 },
        { name: 'Animals', description: 'Animals, pets, and wildlife', quota: 100 },
        { name: 'Places', description: 'Cities, countries, and landmarks', quota: 100 },
        { name: 'Books & Literature', description: 'Books, authors, and literary works', quota: 100 },
        { name: 'Science & Technology', description: 'Scientific concepts and technology', quota: 100 }
      ];

      for (const category of defaultCategories) {
        await db.addCategory(category.name, category.description, category.quota);
      }

      await db.close();
      
      console.log(chalk.green('✅ Database initialized successfully!'));
      console.log(chalk.gray('Default categories added:'));
      defaultCategories.forEach(cat => {
        console.log(chalk.gray(`  • ${cat.name}`));
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize database:'), error.message);
      process.exit(1);
    }
  });

// Normalize command
program
  .command('normalize')
  .description('Test phrase normalization')
  .argument('<phrase>', 'Phrase to normalize')
  .option('-v, --verbose', 'Show detailed normalization steps')
  .action((phrase, options) => {
    try {
      console.log(chalk.blue('🔧 Normalizing phrase...'));
      console.log(chalk.gray('='.repeat(40)));
      
      const normalizer = new PhraseNormalizer();
      const result = normalizer.normalize(phrase);
      
      console.log(chalk.cyan('Original:'), phrase);
      console.log(chalk.green('Normalized:'), result.normalized);
      console.log(chalk.blue('Valid:'), result.isValid ? '✅' : '❌');
      console.log(chalk.gray('Word Count:'), result.wordCount);
      
      if (options.verbose) {
        console.log(chalk.gray('\nDetailed Info:'));
        console.log(chalk.gray('Original Length:'), result.originalLength);
        console.log(chalk.gray('Normalized Length:'), result.normalizedLength);
        console.log(chalk.gray('First Word:'), normalizer.extractFirstWord(result.normalized));
      }
      
      if (result.errors.length > 0) {
        console.log(chalk.red('\nErrors:'));
        result.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to normalize phrase:'), error.message);
      process.exit(1);
    }
  });

// Check-duplicate command
program
  .command('check-duplicate')
  .description('Check if a phrase can be added (duplicate detection)')
  .argument('<phrase>', 'Phrase to check')
  .argument('<category>', 'Category to check in')
  .option('-v, --verbose', 'Show detailed duplicate analysis')
  .action(async (phrase, category, options) => {
    try {
      console.log(chalk.blue('🔍 Checking for duplicates...'));
      console.log(chalk.gray('='.repeat(40)));
      
      const db = new PhraseDatabase();
      await db.initialize();
      
      const detector = new DuplicateDetector(db);
      const result = await detector.checkDuplicate(phrase, category);
      
      console.log(chalk.cyan('Phrase:'), phrase);
      console.log(chalk.cyan('Category:'), category);
      console.log(chalk.blue('Status:'), result.canAdd ? chalk.green('✅ Can Add') : chalk.red('❌ Cannot Add'));
      
      if (!result.canAdd) {
        console.log(chalk.red('Reason:'), result.reason);
        
        if (options.verbose && result.details) {
          console.log(chalk.gray('\\nDetails:'));
          console.log(chalk.gray(JSON.stringify(result.details, null, 2)));
        }
      }
      
      await db.close();
    } catch (error) {
      console.error(chalk.red('Error checking duplicates:'), error.message);
      process.exit(1);
    }
  });

// Check-common command
program
  .command('check-common')
  .description('Check if a phrase is too common for the game')
  .argument('<phrase>', 'Phrase to check for commonality')
  .option('-v, --verbose', 'Show detailed commonality analysis')
  .option('--no-wikipedia', 'Disable Wikipedia checking')
  .action(async (phrase, options) => {
    try {
      console.log(chalk.blue('🔍 Checking phrase commonality...'));
      console.log(chalk.gray('='.repeat(40)));
      
      const detector = new CommonPhraseDetector({
        enableWikipediaCheck: options.wikipedia,
        requestDelay: 200 // Be nice to Wikipedia
      });
      
      const result = await detector.checkCommonality(phrase);
      
      console.log(chalk.cyan('Phrase:'), phrase);
      console.log(chalk.blue('Status:'), result.isTooCommon ? chalk.red('❌ Too Common') : chalk.green('✅ Acceptable'));
      console.log(chalk.yellow('Reason:'), result.reason);
      
      if (options.verbose && result.details) {
        console.log(chalk.gray('\\nDetailed Analysis:'));
        console.log(chalk.gray('='.repeat(20)));
        
        if (result.details.localCheck) {
          console.log(chalk.gray('Local Check:'), result.details.localCheck.type);
        }
        
        if (result.details.wikipediaCheck) {
          console.log(chalk.gray('Wikipedia Check:'), result.details.wikipediaCheck.type);
          if (result.details.wikipediaCheck.title) {
            console.log(chalk.gray('Wikipedia Title:'), result.details.wikipediaCheck.title);
          }
          if (result.details.wikipediaCheck.extract) {
            console.log(chalk.gray('Extract:'), result.details.wikipediaCheck.extract);
          }
        }
        
        console.log(chalk.gray('Timestamp:'), result.details.timestamp);
      }
      
      // Show detector statistics
      const stats = detector.getStats();
      console.log(chalk.gray('\\nDetector Info:'));
      console.log(chalk.gray('- Common phrases database:'), stats.commonPhrasesCount, 'entries');
      console.log(chalk.gray('- Wikipedia cache:'), stats.cacheSize, 'entries');
      console.log(chalk.gray('- Wikipedia enabled:'), stats.wikipediaEnabled);
      console.log(chalk.gray('- Local checking enabled:'), stats.localCheckEnabled);
      
    } catch (error) {
      console.error(chalk.red('❌ Error checking commonality:'), error.message);
      logger.error('CLI check-common error:', error);
      process.exit(1);
    }
  });

program.parse(); 