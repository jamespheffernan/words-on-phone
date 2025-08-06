#!/usr/bin/env node

const WikidataProcessor = require('./wikidata-processor');
const { program } = require('commander');

program
  .name('wikidata-cli')
  .description('CLI for PhraseMachine v2 Wikidata processing')
  .version('1.0.0');

program
  .command('ingest')
  .description('Download and process Wikidata dump into Redis')
  .option('-u, --url <url>', 'Wikidata dump URL', 'https://dumps.wikimedia.org/wikidatawiki/entities/latest-all.json.bz2')
  .option('-m, --max <number>', 'Maximum entities to process', '50000000')
  .option('-b, --batch <number>', 'Batch size for Redis operations', '10000')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    console.log('🚀 Starting Wikidata ingestion process...');
    console.log(`📊 Configuration:`);
    console.log(`   🔗 Dump URL: ${options.url}`);
    console.log(`   📈 Max entries: ${parseInt(options.max).toLocaleString()}`);
    console.log(`   📦 Batch size: ${options.batch}`);
    console.log(`   🗄️ Redis URL: ${options.redis}`);
    console.log('');
    
    const processor = new WikidataProcessor({
      dumpUrl: options.url,
      maxEntries: parseInt(options.max),
      batchSize: parseInt(options.batch)
    });
    
    try {
      // Initialize Redis
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis. Please ensure Redis is running.');
        process.exit(1);
      }
      
      // Start processing
      const startTime = Date.now();
      await processor.processDump();
      const totalTime = (Date.now() - startTime) / 1000;
      
      console.log('');
      console.log('🎉 Wikidata ingestion completed successfully!');
      console.log(`⏱️ Total time: ${(totalTime / 60).toFixed(1)} minutes`);
      
      // Show final stats
      const stats = await processor.getStats();
      console.log('📊 Final Statistics:');
      console.log(`   🗂️ Total Redis keys: ${stats.total_keys.toLocaleString()}`);
      console.log(`   ✅ Processed entities: ${stats.processed_entities.toLocaleString()}`);
      console.log(`   ⚠️ Skipped entities: ${stats.skipped_entities.toLocaleString()}`);
      console.log(`   📈 Progress: ${stats.progress_percent}%`);
      
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
  .description('Test distinctiveness checking with sample phrases')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    console.log('🧪 Testing distinctiveness checking...');
    
    const processor = new WikidataProcessor();
    
    try {
      // Connect to Redis
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis. Please ensure Redis is running and data is loaded.');
        process.exit(1);
      }
      
      // Test phrases
      const testPhrases = [
        'pizza',
        'taylor swift',
        'artificial intelligence',
        'quantum computing',
        'Barack Obama',
        'nonexistent phrase xyz123',
        'machine learning',
        'pizza margherita',
        'New York City',
        'completely made up phrase'
      ];
      
      console.log('📝 Testing phrases:');
      console.log('');
      
      let totalDuration = 0;
      let successCount = 0;
      
      for (const phrase of testPhrases) {
        try {
          const result = await processor.checkDistinctiveness(phrase);
          totalDuration += result.duration_ms;
          
          if (result.duration_ms <= 50) {
            successCount++;
          }
          
          console.log(`🔍 "${phrase}"`);
          console.log(`   📊 Score: ${result.score}/25 (${result.type})`);
          console.log(`   ⏱️ Duration: ${result.duration_ms}ms ${result.duration_ms <= 50 ? '✅' : '⚠️'}`);
          
          if (result.id) {
            console.log(`   🆔 Wikidata ID: ${result.id}`);
          }
          if (result.sitelinks) {
            console.log(`   🌐 Sitelinks: ${result.sitelinks}`);
          }
          if (result.main_label) {
            console.log(`   🏷️ Main label: ${result.main_label}`);
          }
          
          console.log('');
          
        } catch (error) {
          console.error(`❌ Error testing "${phrase}":`, error.message);
        }
      }
      
      const avgDuration = totalDuration / testPhrases.length;
      const performanceRate = (successCount / testPhrases.length) * 100;
      
      console.log('📊 Test Results Summary:');
      console.log(`   📝 Total phrases tested: ${testPhrases.length}`);
      console.log(`   ⏱️ Average duration: ${avgDuration.toFixed(1)}ms`);
      console.log(`   🎯 Performance target (<50ms): ${successCount}/${testPhrases.length} (${performanceRate.toFixed(1)}%)`);
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
  .description('Show current processing statistics')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    const processor = new WikidataProcessor();
    
    try {
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis');
        process.exit(1);
      }
      
      const stats = await processor.getStats();
      
      console.log('📊 Wikidata Processing Statistics:');
      console.log(`   🔌 Redis connected: ${stats.connected ? '✅ Yes' : '❌ No'}`);
      
      if (stats.connected) {
        console.log(`   🗂️ Total Redis keys: ${stats.total_keys.toLocaleString()}`);
        console.log(`   ✅ Processed entities: ${stats.processed_entities.toLocaleString()}`);
        console.log(`   ⚠️ Skipped entities: ${stats.skipped_entities.toLocaleString()}`);
        console.log(`   🎯 Target entries: ${stats.target_entries.toLocaleString()}`);
        console.log(`   📈 Progress: ${stats.progress_percent}%`);
        
        if (stats.total_keys >= 50000000) {
          console.log('   ✅ Target of 50M+ entries achieved!');
        } else {
          console.log(`   ⏳ Need ${(50000000 - stats.total_keys).toLocaleString()} more entries to reach target`);
        }
      }
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      process.exit(1);
    }
  });

program
  .command('clear')
  .description('Clear all Wikidata entries from Redis')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    const processor = new WikidataProcessor();
    
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
          rl.question('⚠️ This will delete ALL Wikidata entries from Redis. Continue? (y/N): ', resolve);
        });
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('🛑 Operation cancelled');
          await processor.close();
          return;
        }
      }
      
      console.log('🗑️ Clearing Wikidata entries from Redis...');
      
      // Use Redis SCAN to find and delete wikidata keys
      const keys = [];
      let cursor = 0;
      
      do {
        const result = await processor.redisClient.scan(cursor, {
          MATCH: 'wikidata:*',
          COUNT: 10000
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);
      
      if (keys.length > 0) {
        console.log(`🗑️ Deleting ${keys.length.toLocaleString()} keys...`);
        await processor.redisClient.del(keys);
        console.log('✅ All Wikidata entries cleared from Redis');
      } else {
        console.log('ℹ️ No Wikidata entries found in Redis');
      }
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Failed to clear data:', error.message);
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