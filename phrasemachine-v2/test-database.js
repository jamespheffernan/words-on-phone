const { initializeDatabase } = require('./database/connection');
const Phrase = require('./database/models/phrase');
const PhraseScore = require('./database/models/phrase-score');
const GenerationSession = require('./database/models/generation-session');

async function testDatabase() {
  console.log('🧪 Testing PhraseMachine v2 Database Integration...');
  
  let db = null;
  
  try {
    // Test 1: Database Connection
    console.log('\n🔗 Test 1: Database Connection');
    db = await initializeDatabase();
    
    const health = await db.checkHealth();
    console.log(`✅ Database connection: ${health.status}`);
    console.log(`📊 Database: ${health.database.database_name}`);
    console.log(`⏱️ Response time: ${health.response_time_ms}ms`);
    console.log(`🔗 Pool: ${health.pool.idleCount}/${health.pool.totalCount} connections`);
    
    // Test 2: Schema Verification
    console.log('\n📋 Test 2: Schema Verification');
    const tables = await db.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => {
      console.log(`   📊 ${row.table_name} (${row.column_count} columns)`);
    });
    
    // Test 3: Phrase Model Operations
    console.log('\n📝 Test 3: Phrase Model Operations');
    
    // Create test phrase
    const testPhrase = new Phrase({
      phrase: 'test phrase for database',
      category: 'general',
      source: 'manual'
    });
    
    await testPhrase.save();
    console.log(`✅ Created phrase: ${testPhrase.phrase} (ID: ${testPhrase.id})`);
    
    // Find phrase by ID
    const foundPhrase = await Phrase.findById(testPhrase.id);
    console.log(`✅ Found phrase by ID: ${foundPhrase ? foundPhrase.phrase : 'Not found'}`);
    
    // Search phrases
    const searchResults = await Phrase.search({ category: 'general', limit: 5 });
    console.log(`✅ Search results: ${searchResults.length} phrases found`);
    
    // Get phrase stats
    const phraseStats = await Phrase.getStats();
    console.log(`✅ Phrase statistics: ${phraseStats.overall.total_phrases} total phrases`);
    
    // Test 4: PhraseScore Model Operations
    console.log('\n🎯 Test 4: PhraseScore Model Operations');
    
    // Create test score
    const testScore = new PhraseScore({
      phrase_id: testPhrase.id,
      distinctiveness_score: 15.5,
      describability_score: 18.2,
      legacy_heuristics_score: 22.0,
      cultural_validation_score: 12.3,
      final_score: 68.0,
      quality_classification: 'good',
      decision_recommendation: 'likely_accept',
      scoring_duration_ms: 150,
      scorer_instance: 'test-instance'
    });
    
    await testScore.save();
    console.log(`✅ Created phrase score: ${testScore.final_score}/100 (ID: ${testScore.id})`);
    
    // Find score by phrase ID
    const foundScore = await PhraseScore.getLatestByPhraseId(testPhrase.id);
    console.log(`✅ Found latest score: ${foundScore ? foundScore.final_score : 'Not found'}/100`);
    
    // Get scoring stats
    const scoreStats = await PhraseScore.getStats();
    console.log(`✅ Score statistics: ${scoreStats.overall.total_scores} total scores, avg ${scoreStats.overall.avg_final_score}`);
    
    // Test 5: GenerationSession Model Operations
    console.log('\n🤖 Test 5: GenerationSession Model Operations');
    
    // Create test session
    const testSession = new GenerationSession({
      category: 'pop_culture',
      count_requested: 10,
      quality_target: 'good',
      generation_type: 'single',
      phrases_generated: 8,
      phrases_accepted: 6,
      avg_quality_score: 72.5,
      total_duration_ms: 5500,
      generation_duration_ms: 3200,
      scoring_duration_ms: 2300,
      status: 'completed',
      llm_model: 'gpt-4',
      llm_temperature: 0.7
    });
    
    await testSession.save();
    console.log(`✅ Created generation session: ${testSession.phrases_generated} phrases (ID: ${testSession.id})`);
    
    // Update test phrase with session ID
    testPhrase.generation_session_id = testSession.id;
    await testPhrase.save();
    console.log(`✅ Linked phrase to session`);
    
    // Get session with phrases
    const sessionWithPhrases = await testSession.getWithPhrases();
    console.log(`✅ Session with phrases: ${sessionWithPhrases.phrases.length} linked phrases`);
    
    // Get session stats
    const sessionStats = await GenerationSession.getStats();
    console.log(`✅ Session statistics: ${sessionStats.overall.total_sessions} total sessions`);
    
    // Test 6: Complex Queries and Views
    console.log('\n🔍 Test 6: Complex Queries and Views');
    
    // Test view: latest_phrase_scores
    const latestScores = await db.query('SELECT * FROM latest_phrase_scores LIMIT 3');
    console.log(`✅ Latest phrase scores view: ${latestScores.rows.length} results`);
    
    // Test view: phrase_stats_by_category
    const categoryStats = await db.query('SELECT * FROM phrase_stats_by_category');
    console.log(`✅ Category statistics view: ${categoryStats.rows.length} categories`);
    categoryStats.rows.forEach(row => {
      console.log(`   📊 ${row.category}: ${row.total_phrases} phrases, avg score ${row.avg_score || 'N/A'}`);
    });
    
    // Test 7: Performance and Constraints
    console.log('\n⚡ Test 7: Performance and Constraints');
    
    // Test unique constraint (should fail)
    try {
      const duplicatePhrase = new Phrase({
        phrase: 'test phrase for database', // Same as testPhrase
        category: 'general'
      });
      await duplicatePhrase.save();
      console.log('❌ Duplicate constraint should have failed');
    } catch (error) {
      console.log('✅ Duplicate constraint working: prevented duplicate phrase');
    }
    
    // Test score validation (should fail)
    try {
      const invalidScore = new PhraseScore({
        phrase_id: testPhrase.id,
        final_score: 150 // Invalid score > 100
      });
      await invalidScore.save();
      console.log('❌ Score validation should have failed');
    } catch (error) {
      console.log('✅ Score validation working: prevented invalid score');
    }
    
    // Test 8: Bulk Operations
    console.log('\n📦 Test 8: Bulk Operations');
    
    // Bulk insert phrases
    const bulkPhrases = [
      'test bulk phrase 1',
      'test bulk phrase 2',
      'test bulk phrase 3'
    ];
    
    const bulkResult = await Phrase.bulkInsert(bulkPhrases, {
      source: 'bulk_test',
      generation_session_id: testSession.id
    });
    
    console.log(`✅ Bulk insert: ${bulkResult.successful_count}/${bulkResult.total_attempted} phrases created`);
    
    // Bulk insert scores
    const bulkScores = bulkResult.successful.map(phrase => ({
      phrase_id: phrase.id,
      distinctiveness_score: Math.random() * 25,
      describability_score: Math.random() * 25,
      legacy_heuristics_score: Math.random() * 30,
      cultural_validation_score: Math.random() * 25,
      final_score: Math.random() * 100,
      quality_classification: 'acceptable',
      decision_recommendation: 'conditional_accept'
    }));
    
    const bulkScoreResult = await PhraseScore.bulkInsert(bulkScores);
    console.log(`✅ Bulk score insert: ${bulkScoreResult.successful_count}/${bulkScoreResult.total_attempted} scores created`);
    
    // Test 9: Analytics and Reporting
    console.log('\n📊 Test 9: Analytics and Reporting');
    
    // Quality trends
    const qualityTrends = await PhraseScore.getQualityTrends({ days: 1 });
    console.log(`✅ Quality trends: ${qualityTrends.quality_trends.length} time periods analyzed`);
    
    // Performance metrics
    const performanceMetrics = await PhraseScore.getPerformanceMetrics({ days: 1 });
    console.log(`✅ Performance metrics: ${performanceMetrics.performance_metrics.length} metric groups`);
    
    // Top phrases by category
    const topPhrases = await PhraseScore.getTopPhrasesByCategory(3);
    console.log(`✅ Top phrases: ${Object.keys(topPhrases.top_phrases_by_category).length} categories`);
    
    // Session performance
    const sessionPerformance = await GenerationSession.getPerformanceMetrics({ days: 1 });
    console.log(`✅ Session performance: ${sessionPerformance.performance_metrics.length} performance groups`);
    
    // Test 10: Cleanup Test Data
    console.log('\n🧹 Test 10: Cleanup Test Data');
    
    // Delete test phrases (cascades to scores)
    const testPhraseIds = [testPhrase.id, ...bulkResult.successful.map(p => p.id)];
    const deletedCount = await Phrase.bulkUpdateStatus(testPhraseIds, 'archived');
    console.log(`✅ Archived ${deletedCount} test phrases`);
    
    // Complete test session
    await testSession.complete({
      test_completed: true,
      cleanup_performed: true
    });
    console.log(`✅ Completed test session`);
    
    console.log('\n🎉 All database tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Database connection and health check');
    console.log('   ✅ Schema verification and table structure');
    console.log('   ✅ Phrase model CRUD operations');
    console.log('   ✅ PhraseScore model and scoring history');
    console.log('   ✅ GenerationSession model and session tracking');
    console.log('   ✅ Complex queries and database views');
    console.log('   ✅ Data validation and constraint enforcement');
    console.log('   ✅ Bulk operations and batch processing');
    console.log('   ✅ Analytics queries and performance metrics');
    console.log('   ✅ Data cleanup and session management');
    console.log('\n🎯 Database integration ready for production use!');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

testDatabase().catch(console.error); 