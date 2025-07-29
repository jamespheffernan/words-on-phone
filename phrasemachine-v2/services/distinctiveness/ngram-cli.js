#!/usr/bin/env node

const NgramProcessor = require('./ngram-processor');
const { program } = require('commander');

program
  .name('ngram-cli')
  .description('CLI for PhraseMachine v2 Google Books N-gram processing')
  .version('1.0.0');

program
  .command('ingest')
  .description('Download and process Google Books N-gram data into Redis')
  .option('-l, --language <lang>', 'Language code', 'eng')
  .option('-v, --version <version>', 'N-gram version', '2019')
  .option('-t, --types <types>', 'N-gram types (comma-separated)', '2gram,3gram,4gram')
  .option('-y, --min-year <year>', 'Minimum year for filtering', '2000')
  .option('-c, --min-count <count>', 'Minimum occurrence count', '40')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    console.log('🚀 Starting Google Books N-gram ingestion process...');
    console.log(`📊 Configuration:`);
    console.log(`   🌍 Language: ${options.language}`);
    console.log(`   📅 Version: ${options.version}`);
    console.log(`   📝 N-gram types: ${options.types}`);
    console.log(`   📈 Min year: ${options.minYear}`);
    console.log(`   🔢 Min count: ${options.minCount}`);
    console.log(`   🗄️ Redis URL: ${options.redis}`);
    console.log('');
    console.log('⚠️ WARNING: This is a very long-running operation (several hours)');
    console.log('⚠️ N-gram files are very large (gigabytes) and require significant disk space');
    console.log('');
    
    const processor = new NgramProcessor({
      language: options.language,
      version: options.version,
      ngramTypes: options.types.split(','),
      minYear: parseInt(options.minYear),
      minCount: parseInt(options.minCount)
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
      await processor.processNgramFiles();
      const totalTime = (Date.now() - startTime) / 1000;
      
      console.log('');
      console.log('🎉 N-gram ingestion completed successfully!');
      console.log(`⏱️ Total time: ${(totalTime / 3600).toFixed(1)} hours`);
      
      // Show final stats
      const stats = await processor.getStats();
      console.log('📊 Final Statistics:');
      console.log(`   📊 Total N-grams: ${stats.corpus.total_ngrams.toLocaleString()}`);
      console.log(`   📚 Total volumes: ${stats.corpus.total_volumes.toLocaleString()}`);
      console.log(`   🗂️ Redis keys: ${stats.redis.total_keys.toLocaleString()}`);
      console.log(`   📅 Last processed: ${stats.corpus.last_processed}`);
      
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
  .description('Test PMI calculation with sample phrases')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    console.log('🧪 Testing PMI calculation...');
    
    const processor = new NgramProcessor();
    
    try {
      // Connect to Redis
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis. Please ensure Redis is running and data is loaded.');
        process.exit(1);
      }
      
      // Check if corpus is loaded
      const stats = await processor.getStats();
      if (!stats.corpus.total_ngrams || stats.corpus.total_ngrams === 0) {
        console.error('❌ No N-gram corpus found in Redis. Please run "npm run ngram:ingest" first.');
        process.exit(1);
      }
      
      console.log(`📊 Using corpus with ${stats.corpus.total_ngrams.toLocaleString()} n-grams`);
      
      // Test phrases
      const testPhrases = [
        'machine learning',
        'artificial intelligence',
        'new york',
        'pizza delivery',
        'social media',
        'climate change',
        'quantum computing',
        'completely random phrase',
        'ice cream',
        'coffee shop'
      ];
      
      console.log('📝 Testing phrases:');
      console.log('');
      
      let totalDuration = 0;
      let successCount = 0;
      
      for (const phrase of testPhrases) {
        try {
          const result = await processor.calculatePMI(phrase);
          totalDuration += result.duration_ms;
          
          if (result.duration_ms <= 50) {
            successCount++;
          }
          
          console.log(`🔍 "${phrase}"`);
          console.log(`   📊 PMI: ${result.pmi} | Score: ${result.score}/15 (${result.type})`);
          console.log(`   ⏱️ Duration: ${result.duration_ms}ms ${result.duration_ms <= 50 ? '✅' : '⚠️'}`);
          
          if (result.phrase_count) {
            console.log(`   🔢 Phrase count: ${result.phrase_count.toLocaleString()}`);
          }
          if (result.word_counts && result.word_counts.length > 0) {
            console.log(`   📝 Word counts: ${result.word_counts.map(c => c.toLocaleString()).join(', ')}`);
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
  .description('Show current N-gram processing statistics')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    const processor = new NgramProcessor();
    
    try {
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis');
        process.exit(1);
      }
      
      const stats = await processor.getStats();
      
      console.log('📊 Google Books N-gram Statistics:');
      console.log(`   🔌 Redis connected: ${stats.connected ? '✅ Yes' : '❌ No'}`);
      
      if (stats.connected && stats.corpus) {
        console.log(`   📊 Total N-grams: ${stats.corpus.total_ngrams.toLocaleString()}`);
        console.log(`   📚 Total volumes: ${stats.corpus.total_volumes.toLocaleString()}`);
        console.log(`   🌍 Language: ${stats.corpus.language}`);
        console.log(`   📅 Version: ${stats.corpus.version}`);
        console.log(`   🗂️ Redis keys: ${stats.redis.total_keys.toLocaleString()}`);
        
        if (stats.corpus.last_processed) {
          console.log(`   ⏰ Last processed: ${stats.corpus.last_processed}`);
        }
        
        if (stats.corpus.total_ngrams > 0) {
          console.log('   ✅ N-gram corpus loaded and ready for PMI calculations!');
        } else {
          console.log('   ⚠️ No N-gram data found. Run ingestion first.');
        }
      } else {
        console.log('   ⚠️ No corpus data found in Redis');
      }
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      process.exit(1);
    }
  });

program
  .command('clear')
  .description('Clear all N-gram data from Redis')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    const processor = new NgramProcessor();
    
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
          rl.question('⚠️ This will delete ALL N-gram data from Redis. Continue? (y/N): ', resolve);
        });
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('🛑 Operation cancelled');
          await processor.close();
          return;
        }
      }
      
      console.log('🗑️ Clearing N-gram data from Redis...');
      
      // Use Redis SCAN to find and delete ngram keys
      const patterns = ['ngram:*', 'word:*', 'corpus:*'];
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
        console.log(`✅ Cleared ${totalDeleted.toLocaleString()} N-gram keys from Redis`);
      } else {
        console.log('ℹ️ No N-gram data found in Redis');
      }
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Failed to clear data:', error.message);
      await processor.close();
      process.exit(1);
    }
  });

program
  .command('sample')
  .description('Download and process a small sample of N-gram data for testing')
  .option('-r, --redis <url>', 'Redis connection URL', process.env.REDIS_URL || 'redis://localhost:6379')
  .action(async (options) => {
    console.log('📥 Downloading sample N-gram data for testing...');
    console.log('ℹ️ This will download only the first file of each type (much faster than full ingestion)');
    
    const processor = new NgramProcessor({
      ngramTypes: ['2gram'], // Only download 2grams for sample
      minYear: 2010, // More recent data
      minCount: 100 // Higher threshold for sample
    });
    
    try {
      // Initialize Redis
      const connected = await processor.initRedis();
      if (!connected) {
        console.error('❌ Failed to connect to Redis. Please ensure Redis is running.');
        process.exit(1);
      }
      
      // Override download method to get only first file
      const originalDownload = processor.downloadNgramFiles.bind(processor);
      processor.downloadNgramFiles = async function() {
        console.log('📥 Downloading sample N-gram files (first file only)...');
        const downloadedFiles = [];
        
        // Download only the 'a' file for 2gram
        const filename = `googlebooks-eng-all-2gram-20190101-a.gz`;
        const url = `${this.ngramBaseUrl}/${filename}`;
        const localPath = require('path').join(this.dataDir, filename);
        
        try {
          if (require('fs').existsSync(localPath)) {
            console.log(`📁 ${filename} already exists, using existing file`);
          } else {
            console.log(`📥 Downloading ${filename}...`);
            await this.downloadFile(url, localPath);
          }
          downloadedFiles.push(localPath);
        } catch (error) {
          console.error(`❌ Failed to download sample: ${error.message}`);
          throw error;
        }
        
        return downloadedFiles;
      };
      
      // Start processing
      const startTime = Date.now();
      await processor.processNgramFiles();
      const totalTime = (Date.now() - startTime) / 1000;
      
      console.log('');
      console.log('🎉 Sample N-gram ingestion completed!');
      console.log(`⏱️ Total time: ${totalTime.toFixed(1)} seconds`);
      
      // Show stats
      const stats = await processor.getStats();
      console.log('📊 Sample Statistics:');
      console.log(`   📊 Total N-grams: ${stats.corpus.total_ngrams.toLocaleString()}`);
      console.log(`   🗂️ Redis keys: ${stats.redis.total_keys.toLocaleString()}`);
      
      console.log('');
      console.log('✅ Sample data ready for testing PMI calculations!');
      console.log('💡 Try: npm run ngram:test');
      
      await processor.close();
      
    } catch (error) {
      console.error('❌ Sample ingestion failed:', error.message);
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