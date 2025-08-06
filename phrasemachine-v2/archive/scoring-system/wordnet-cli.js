#!/usr/bin/env node

const WordNetProcessor = require('./wordnet-processor');
const { program } = require('commander');

program
  .name('wordnet-cli')
  .description('CLI for PhraseMachine v2 WordNet multi-word entry processing')
  .version('1.0.0');

program
  .command('test')
  .description('Test WordNet multi-word entry detection with sample phrases')
  .action(async () => {
    console.log('🧪 Testing WordNet multi-word entry detection...');
    
    const processor = new WordNetProcessor();
    
    try {
      // Test phrases
      const testPhrases = [
        'ice cream',
        'coffee shop',
        'machine learning',
        'social media',
        'basketball court',
        'hot dog',
        'new york',
        'smart phone',
        'french fries',
        'swimming pool',
        'post office',
        'video game',
        'completely random',
        'single'
      ];
      
      console.log('📝 Testing phrases:');
      console.log('');
      
      let totalDuration = 0;
      let foundCount = 0;
      
      for (const phrase of testPhrases) {
        try {
          const result = await processor.checkMultiWordEntry(phrase);
          totalDuration += result.duration_ms;
          
          if (result.score > 0) {
            foundCount++;
          }
          
          const status = result.score > 0 ? '✅ FOUND' : '❌ NOT FOUND';
          console.log(`${status} "${phrase}"`);
          console.log(`   📊 Score: ${result.score}/10 | Type: ${result.type}`);
          console.log(`   ⏱️ Duration: ${result.duration_ms}ms`);
          
          if (result.method) {
            console.log(`   🔍 Method: ${result.method}`);
          }
          if (result.pattern) {
            console.log(`   🎯 Pattern: ${result.pattern}`);
          }
          
          console.log('');
          
        } catch (error) {
          console.error(`❌ Error testing "${phrase}":`, error.message);
        }
      }
      
      const avgDuration = totalDuration / testPhrases.length;
      const foundRate = (foundCount / testPhrases.length) * 100;
      
      console.log('📊 Test Results Summary:');
      console.log(`   📝 Total phrases tested: ${testPhrases.length}`);
      console.log(`   ✅ Multi-word entries found: ${foundCount}/${testPhrases.length} (${foundRate.toFixed(1)}%)`);
      console.log(`   ⏱️ Average duration: ${avgDuration.toFixed(1)}ms`);
      console.log(`   🎯 Performance target (<50ms): ${avgDuration <= 50 ? '✅ Met' : '⚠️ Above target'}`);
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show WordNet processing statistics')
  .action(async () => {
    const processor = new WordNetProcessor();
    
    try {
      const stats = await processor.getStats();
      
      console.log('📊 WordNet Multi-Word Entry Statistics:');
      console.log(`   📚 Curated entries: ${stats.multi_word_entries_count}`);
      console.log(`   🎯 Compound patterns: ${stats.compound_patterns_count}`);
      console.log(`   📝 Description: ${stats.description}`);
      console.log(`   ⏰ Last updated: ${stats.timestamp}`);
      
      if (stats.multi_word_entries_count > 0) {
        console.log('   ✅ WordNet processor ready for multi-word entry detection!');
      } else {
        console.log('   ⚠️ No multi-word entries loaded');
      }
      
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Check WordNet processor health')
  .action(async () => {
    const processor = new WordNetProcessor();
    
    try {
      const health = await processor.checkHealth();
      
      console.log('🏥 WordNet Processor Health Check:');
      console.log(`   🔌 Status: ${health.status}`);
      console.log(`   📚 Multi-word entries loaded: ${health.multi_word_entries_loaded ? '✅ Yes' : '❌ No'}`);
      console.log(`   🎯 Patterns loaded: ${health.patterns_loaded ? '✅ Yes' : '❌ No'}`);
      console.log(`   ⏰ Timestamp: ${health.timestamp}`);
      
      if (health.status === 'healthy') {
        console.log('   ✅ WordNet processor is healthy and ready!');
      } else {
        console.log('   ⚠️ WordNet processor has issues');
      }
      
    } catch (error) {
      console.error('❌ Failed to check health:', error.message);
      process.exit(1);
    }
  });

program
  .command('lookup <phrase>')
  .description('Look up a specific phrase for multi-word entry detection')
  .action(async (phrase) => {
    const processor = new WordNetProcessor();
    
    try {
      console.log(`🔍 Looking up "${phrase}"...`);
      
      const result = await processor.checkMultiWordEntry(phrase);
      
      console.log('📊 Results:');
      console.log(`   Score: ${result.score}/10 points`);
      console.log(`   Type: ${result.type}`);
      console.log(`   Duration: ${result.duration_ms}ms`);
      
      if (result.method) {
        console.log(`   Method: ${result.method}`);
      }
      if (result.pattern) {
        console.log(`   Pattern: ${result.pattern}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.score > 0) {
        console.log('   ✅ Multi-word entry found!');
      } else {
        console.log('   ❌ Not found as multi-word entry');
      }
      
    } catch (error) {
      console.error('❌ Lookup failed:', error.message);
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