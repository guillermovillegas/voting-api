/**
 * PostgreSQL Connection Pool
 *
 * Manages database connections efficiently using connection pooling.
 * Handles connection lifecycle, errors, and configuration.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import { Pool, PoolConfig } from 'pg';

// ============================================================================
// CONFIGURATION
// ============================================================================

const getPoolConfig = (): PoolConfig => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required. ' +
        'Format: postgresql://user:password@host:port/database'
    );
  }

  // Parse connection string or use individual env vars
  const config: PoolConfig = {
    connectionString: databaseUrl,
    // Connection pool settings
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 5000, // 5 seconds
  };

  // SSL configuration for production (e.g., Azure PostgreSQL)
  if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
    config.ssl = {
      rejectUnauthorized: false, // For Azure PostgreSQL
    };
  }

  return config;
};

// ============================================================================
// POOL INSTANCE
// ============================================================================

let pool: Pool | null = null;

/**
 * Get or create the database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const config = getPoolConfig();
    pool = new Pool(config);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
      // Don't exit the process, just log the error
    });

    // Log pool events in development
    if (process.env.NODE_ENV !== 'production') {
      pool.on('connect', () => {
        console.log('Database client connected');
      });

      pool.on('remove', () => {
        console.log('Database client removed from pool');
      });
    }
  }

  return pool;
}

/**
 * Close all database connections
 * Call this when shutting down the application
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

/**
 * Test the database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const testPool = getPool();
    const result = await testPool.query('SELECT NOW() as current_time');
    console.log('Database connection test successful:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Export pool instance for direct use if needed
export { pool };
