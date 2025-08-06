const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

/**
 * DatabaseConnection - PostgreSQL connection manager with pooling and transaction support
 * 
 * Features:
 * - Connection pooling with configurable pool size
 * - Transaction management with rollback support
 * - Health monitoring and connection recovery
 * - Query logging and performance monitoring
 * - Migration support
 */
class DatabaseConnection {
  constructor(options = {}) {
    // Database configuration
    this.config = {
      host: options.host || process.env.POSTGRES_HOST || 'localhost',
      port: options.port || process.env.POSTGRES_PORT || 5432,
      database: options.database || process.env.POSTGRES_DB || 'phrasemachine',
      user: options.user || process.env.POSTGRES_USER || 'phrasemachine',
      password: options.password || process.env.POSTGRES_PASSWORD || 'phrasemachine_secure_pass',
      
      // Pool configuration
      max: options.max || 20,                    // Maximum pool size
      min: options.min || 2,                     // Minimum pool size
      idleTimeoutMillis: options.idleTimeout || 30000,
      connectionTimeoutMillis: options.connectionTimeout || 10000,
      
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Application settings
      application_name: options.applicationName || 'phrasemachine-v2'
    };
    
    this.pool = null;
    this.isConnected = false;
    this.healthCheckInterval = null;
    
    // Performance monitoring
    this.queryMetrics = {
      totalQueries: 0,
      totalDuration: 0,
      slowQueries: 0,
      errors: 0,
      lastHealthCheck: null
    };
    
    console.log('🗄️ Database connection configured');
  }

  /**
   * Initialize database connection and pool
   */
  async initialize() {
    try {
      console.log('🔗 Initializing database connection...');
      
      // Create connection pool
      this.pool = new Pool(this.config);
      
      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as server_time, current_database() as database');
      client.release();
      
      this.isConnected = true;
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      console.log(`✅ Database connected: ${result.rows[0].database} at ${result.rows[0].server_time}`);
      console.log(`📊 Pool configured: ${this.config.min}-${this.config.max} connections`);
      
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Execute a single query
   */
  async query(text, params = []) {
    const startTime = Date.now();
    
    try {
      if (!this.pool) {
        throw new Error('Database not initialized');
      }
      
      const result = await this.pool.query(text, params);
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.queryMetrics.totalQueries++;
      this.queryMetrics.totalDuration += duration;
      
      if (duration > 1000) { // Slow query threshold: 1 second
        this.queryMetrics.slowQueries++;
        console.warn(`🐌 Slow query detected (${duration}ms):`, text.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.queryMetrics.errors++;
      
      console.error(`❌ Query failed (${duration}ms):`, error.message);
      console.error('Query:', text.substring(0, 200));
      console.error('Params:', params);
      
      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(queries) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const { text, params } of queries) {
        const result = await client.query(text, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction failed, rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a function within a transaction context
   */
  async withTransaction(fn) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Provide transaction client to the function
      const result = await fn(client);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction function failed, rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   */
  async checkHealth() {
    try {
      const startTime = Date.now();
      const result = await this.query(`
        SELECT 
          NOW() as current_time,
          version() as postgres_version,
          current_database() as database_name,
          current_user as username,
          pg_database_size(current_database()) as database_size
      `);
      
      const responseTime = Date.now() - startTime;
      
      // Get pool status
      const poolStatus = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
      
      this.queryMetrics.lastHealthCheck = new Date().toISOString();
      
      return {
        status: 'healthy',
        database: result.rows[0],
        pool: poolStatus,
        response_time_ms: responseTime,
        metrics: this.queryMetrics,
        timestamp: this.queryMetrics.lastHealthCheck
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkHealth();
      
      if (health.status === 'unhealthy') {
        console.error('🏥 Database health check failed:', health.error);
      } else {
        console.log(`🏥 Database healthy: ${health.response_time_ms}ms, pool: ${health.pool.idleCount}/${health.pool.totalCount}`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(migrationsDir = null) {
    const migrationPath = migrationsDir || path.join(__dirname, 'schema');
    
    try {
      console.log('🔄 Running database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(100) PRIMARY KEY,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          checksum VARCHAR(64),
          execution_time_ms INTEGER
        )
      `);
      
      // Get list of migration files
      const files = await fs.readdir(migrationPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`📁 Found ${migrationFiles.length} migration files`);
      
      for (const file of migrationFiles) {
        const version = path.basename(file, '.sql');
        
        // Check if migration already applied
        const existingResult = await this.query(
          'SELECT version FROM schema_migrations WHERE version = $1',
          [version]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`⏭️ Skipping ${version} (already applied)`);
          continue;
        }
        
        // Read and execute migration
        const migrationFilePath = path.join(migrationPath, file);
        const migrationSQL = await fs.readFile(migrationFilePath, 'utf8');
        
        console.log(`🔄 Applying migration: ${version}`);
        const startTime = Date.now();
        
        await this.withTransaction(async (client) => {
          // Execute migration
          await client.query(migrationSQL);
          
          // Record migration
          const executionTime = Date.now() - startTime;
          await client.query(
            'INSERT INTO schema_migrations (version, execution_time_ms) VALUES ($1, $2)',
            [version, executionTime]
          );
        });
        
        console.log(`✅ Applied ${version} (${Date.now() - startTime}ms)`);
      }
      
      console.log('✅ All migrations completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = await this.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);
      
      const dbSize = await this.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
      `);
      
      return {
        service: 'database_connection',
        database_size: dbSize.rows[0].database_size,
        table_stats: stats.rows,
        connection_metrics: this.queryMetrics,
        pool_status: {
          total_connections: this.pool?.totalCount || 0,
          idle_connections: this.pool?.idleCount || 0,
          waiting_connections: this.pool?.waitingCount || 0
        },
        health_status: this.isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'database_connection',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      console.log('🔌 Closing database connection...');
      
      this.stopHealthMonitoring();
      
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      
      this.isConnected = false;
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error.message);
      throw error;
    }
  }
}

// Export singleton instance and class
let dbInstance = null;

/**
 * Get singleton database connection instance
 */
function getDatabase(options = {}) {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection(options);
  }
  return dbInstance;
}

/**
 * Initialize database with options
 */
async function initializeDatabase(options = {}) {
  const db = getDatabase(options);
  await db.initialize();
  return db;
}

module.exports = {
  DatabaseConnection,
  getDatabase,
  initializeDatabase
};