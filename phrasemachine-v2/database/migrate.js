const { initializeDatabase } = require('./connection');

async function runMigrations() {
  console.log('🔄 Starting PhraseMachine v2 database migration...');
  
  try {
    // Initialize database connection
    const db = await initializeDatabase();
    
    // Run all migrations
    console.log('📁 Running schema migrations...');
    await db.runMigrations();
    
    // Verify tables were created
    console.log('✅ Verifying database schema...');
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Created ${tables.rows.length} tables:`);
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Get initial stats
    const stats = await db.getStats();
    console.log(`📈 Database size: ${stats.database_size}`);
    console.log(`🔗 Pool status: ${stats.pool_status.total_connections} connections`);
    
    await db.close();
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations }; 