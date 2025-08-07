#!/usr/bin/env node

const ConcretenessProcessor = require('./concreteness-processor');
const { program } = require('commander');

program
  .name('concreteness-cli')
  .description('CLI for PhraseMachine v2 Brysbaert concreteness norms processing')
  .version('1.0.0');

program
  .command('ingest')
  .description('Download and process Brysbaert concreteness norms into Redis')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    console.log('🚀 Starting Brysbaert concreteness norms ingestion process...');
    console.log(`📊 Configuration:`);
    console.log(`   📚 Source: Brysbaert et al. (2014) - 40k English words`);
    console.log(`   🔗 Data: Concreteness ratings (1-5 scale)`);
    console.log(`   🗄️ Redis URL: ${options.redis}`);
    console.log('');
    
    const processor = new ConcretenessProcessor();
    
    try {
      // Initialize Redis
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis. Please ensure Redis is running.');
        process.exit(1);
      }
      
      // Start processing
      const startTime = Date.now();
      const totalProcessed = await processor.processConcretenessCsv();
      const totalTime = (Date.now() - startTime) / 1000;
      
      console.log('');
      console.log('🎉 Concreteness ingestion completed successfully!');
      console.log(`⏱️ Total time: ${totalTime.toFixed(1)} seconds`);
      console.log(`📊 Words processed: ${totalProcessed.toLocaleString()}`);
      
      // Show final stats
      const stats = await processor.getStats();
      console.log('📊 Final Statistics:');
      console.log(`   📚 Total words: ${stats.concreteness.total_words.toLocaleString()}`);
      console.log(`   🔥 High concreteness (≥4.0): ${stats.concreteness.distribution.high.toLocaleString()} (15 points)`);
      console.log(`   🔸 Medium concreteness (3.0-3.9): ${stats.concreteness.distribution.medium.toLocaleString()} (8 points)`);
      console.log(`   🔹 Low concreteness (<3.0): ${stats.concreteness.distribution.low.toLocaleString()} (0 points)`);
      console.log(`   📅 Last processed: ${stats.concreteness.last_processed}`);
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Ingestion failed:', error.message);
      console.error(error.stack);
      await processor.close();
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test concreteness scoring with sample phrases')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    console.log('🧪 Testing concreteness scoring...');
    
    const processor = new ConcretenessProcessor();
    
    try {
      // Connect to Redis
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis. Please ensure Redis is running and data is loaded.');
        process.exit(1);
      }
      
      // Check if corpus is loaded
      const stats = await processor.getStats();
      if (!stats.concreteness.total_words || stats.concreteness.total_words === 0) {
        console.error('❌ No concreteness data found in Redis. Please run "npm run concreteness:ingest" first.');
        process.exit(1);
      }
      
      console.log(`📊 Using corpus with ${stats.concreteness.total_words.toLocaleString()} words`);
      
      // Test phrases
      const testPhrases = [
        'coffee cup',
        'ice cream',
        'basketball court',
        'pizza delivery',
        'machine learning',
        'artificial intelligence',
        'social media',
        'quantum computing',
        'climate change',
        'abstract concept',
        'wedding ceremony',
        'mountain peak'
      ];
      
      console.log('📝 Testing phrases:');
      console.log('');
      
      let totalDuration = 0;
      let successCount = 0;
      let totalCoverage = 0;
      
      for (const phrase of testPhrases) {
        try {
          const result = await processor.scoreConcreteness(phrase);
          totalDuration += result.duration_ms;
          totalCoverage += result.coverage || 0;
          
          if (result.duration_ms <= 50) {
            successCount++;
          }
          
          console.log(`🔍 "${phrase}"`);
          console.log(`   📊 Concreteness: ${result.concreteness} | Score: ${result.score}/15 (${result.type})`);
          console.log(`   ⏱️ Duration: ${result.duration_ms}ms ${result.duration_ms <= 50 ? '✅' : '⚠️'}`);
          console.log(`   📋 Coverage: ${result.coverage || 0}% (${result.found_count || 0}/${result.word_count || 0} words found)`);
          
          if (result.word_details && result.word_details.length > 0) {
            const foundWords = result.word_details.filter(w => w.concreteness !== null);
            if (foundWords.length > 0) {
              console.log(`   📝 Word details: ${foundWords.map(w => `${w.word}=${w.concreteness}`).join(', ')}`);
            }
          }
          
          console.log('');
          
        } catch (error) {
          console.error(`❌ Error testing "${phrase}":`, error.message);
        }
      }
      
      const avgDuration = totalDuration / testPhrases.length;
      const avgCoverage = totalCoverage / testPhrases.length;
      const performanceRate = (successCount / testPhrases.length) * 100;
      
      console.log('📊 Test Results Summary:');
      console.log(`   📝 Total phrases tested: ${testPhrases.length}`);
      console.log(`   ⏱️ Average duration: ${avgDuration.toFixed(1)}ms`);
      console.log(`   📋 Average coverage: ${avgCoverage.toFixed(1)}%`);
      console.log(`   🎯 Performance target (<50ms): ${successCount}/${testPhrases.length} (${performanceRate.toFixed(1)}%)`);
      console.log(`   🎯 Coverage target (≥90%): ${avgCoverage >= 90 ? '✅ Met' : '⚠️ Below target'}`);
      console.log(`   ${performanceRate >= 80 ? '✅ Performance target met!' : '⚠️ Performance below target'}`);
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      await processor.close();
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show current concreteness processing statistics')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    const processor = new ConcretenessProcessor();
    
    try {
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis');
        process.exit(1);
      }
      
      const stats = await processor.getStats();
      
      console.log('📊 Brysbaert Concreteness Norms Statistics:');
      console.log(`   🔌 Redis connected: ${stats.connected ? '✅ Yes' : '❌ No'}`);
      
      if (stats.connected && stats.concreteness) {
        console.log(`   📚 Total words: ${stats.concreteness.total_words.toLocaleString()}`);
        console.log(`   📖 Source: ${stats.concreteness.source}`);
        console.log(`   📝 Description: ${stats.concreteness.description}`);
        console.log(`   📦 Version: ${stats.concreteness.version}`);
        console.log(`   🗂️ Redis keys: ${stats.redis.total_keys.toLocaleString()}`);
        
        if (stats.concreteness.last_processed) {
          console.log(`   ⏰ Last processed: ${stats.concreteness.last_processed}`);
        }
        
        console.log(`   📊 Distribution:`);
        console.log(`      🔥 High (≥4.0): ${stats.concreteness.distribution.high.toLocaleString()} words (15 points)`);
        console.log(`      🔸 Medium (3.0-3.9): ${stats.concreteness.distribution.medium.toLocaleString()} words (8 points)`);
        console.log(`      🔹 Low (<3.0): ${stats.concreteness.distribution.low.toLocaleString()} words (0 points)`);
        
        if (stats.concreteness.total_words > 0) {
          console.log('   ✅ Concreteness corpus loaded and ready for scoring!');
        } else {
          console.log('   ⚠️ No concreteness data found. Run ingestion first.');
        }
      } else {
        console.log('   ⚠️ No concreteness data found in Redis');
      }
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      process.exit(1);
    }
  });

program
  .command('clear')
  .description('Clear all concreteness data from Redis')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    const processor = new ConcretenessProcessor();
    
    try {
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis');
        process.exit(1);
      }
      
      if (!options.force) {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('⚠️ This will delete ALL concreteness data from Redis. Continue? (y/N): ', resolve);
        });
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('🛑 Operation cancelled');
          await processor.close();
          return;
        }
      }
      
      console.log('🗑️ Clearing concreteness data from Redis...');
      
      // Use Redis SCAN to find and delete concreteness keys
      const patterns = ['concreteness:*', 'concreteness_stem:*', 'concreteness_stats:*', 'concreteness_meta'];
      let totalDeleted = 0;
      
      for (const pattern of patterns) {
        const keys = [];
        let cursor = 0;
        
        do {
          const result = await processor.redisClient.scan(cursor, {
            MATCH: pattern,
            COUNT: 10000
          });
          cursor = result.cursor;
          keys.push(...result.keys);
        } while (cursor !== 0);
        
        if (keys.length > 0) {
          console.log(`🗑️ Deleting ${keys.length.toLocaleString()} keys matching "${pattern}"...`);
          await processor.redisClient.del(keys);
          totalDeleted += keys.length;
        }
      }
      
      if (totalDeleted > 0) {
        console.log(`✅ Cleared ${totalDeleted.toLocaleString()} concreteness keys from Redis`);
      } else {
        console.log('ℹ️ No concreteness data found in Redis');
      }
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Failed to clear data:', error.message);
      await processor.close();
      process.exit(1);
    }
  });

program
  .command('lookup')
  .description('Look up concreteness rating for a specific word or phrase')
  .argument('<phrase>', 'Word or phrase to look up')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (phrase, options) => {
    const processor = new ConcretenessProcessor();
    
    try {
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis');
        process.exit(1);
      }
      
      console.log(`🔍 Looking up concreteness for: "${phrase}"`);
      
      const result = await processor.scoreConcreteness(phrase);
      
      console.log(`\n📊 Results:`);
      console.log(`   🎯 Score: ${result.score}/15 points`);
      console.log(`   📈 Average concreteness: ${result.concreteness}`);
      console.log(`   📝 Type: ${result.type}`);
      console.log(`   📋 Coverage: ${result.coverage || 0}% (${result.found_count || 0}/${result.word_count || 0} words)`);
      console.log(`   ⏱️ Duration: ${result.duration_ms}ms`);
      
      if (result.word_details && result.word_details.length > 0) {
        console.log(`\n📝 Word Details:`);
        for (const word of result.word_details) {
          if (word.concreteness !== null) {
            console.log(`   • ${word.word}: ${word.concreteness} (${word.lookup_type})`);
            if (word.lookup_type === 'stemmed') {
              console.log(`     └─ From: ${word.original_word} (stem: ${word.stem})`);
            }
          } else {
            console.log(`   • ${word.word}: not found (${word.lookup_type})`);
          }
        }
      }
      
      console.log(`\n💡 Score breakdown:`);
      if (result.concreteness >= 4.0) {
        console.log(`   ✅ High concreteness (≥4.0) = 15 points`);
      } else if (result.concreteness >= 3.0) {
        console.log(`   🔸 Medium concreteness (3.0-3.9) = 8 points`);
      } else if (result.concreteness > 0) {
        console.log(`   🔹 Low concreteness (<3.0) = 0 points`);
      } else {
        console.log(`   ❌ No concreteness data found = 0 points`);
      }
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Lookup failed:', error.message);
      await processor.close();
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

program.parse(); 