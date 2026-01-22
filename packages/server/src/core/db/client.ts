/**
 * Database Client Wrapper
 *
 * Provides helper functions for database operations including:
 * - Query execution with error handling
 * - Transaction management
 * - Prepared statements support
 *
 * OWNERSHIP: AGENT_INFRA
 */

import { PoolClient, QueryResultRow } from 'pg';
import { getPool } from './pool';
import type { QueryResult, TransactionClient } from './types';

// ============================================================================
// QUERY EXECUTION
// ============================================================================

/**
 * Execute a parameterized query
 * @param text SQL query with parameter placeholders ($1, $2, etc.)
 * @param params Array of parameter values
 * @returns Query result with rows
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  try {
    const result = await pool.query<T>(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    // Log error but don't expose database internals to clients
    console.error('Database query error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      query: text.substring(0, 100), // Log first 100 chars of query
    });

    // Re-throw with sanitized message
    throw new Error('Database operation failed');
  }
}

/**
 * Execute a query using a specific client (for transactions)
 */
export async function queryWithClient<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  try {
    const result = await client.query<T>(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    console.error('Database query error (transaction):', {
      message: error instanceof Error ? error.message : 'Unknown error',
      query: text.substring(0, 100),
    });
    throw error; // Re-throw to allow transaction rollback
  }
}

// ============================================================================
// TRANSACTION MANAGEMENT
// ============================================================================

/**
 * Execute a function within a database transaction
 * If the function throws an error, the transaction is rolled back.
 *
 * @param callback Function that receives a transaction client
 * @returns Result of the callback function
 */
export async function transaction<T>(
  callback: (client: TransactionClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Begin transaction
    await client.query('BEGIN');

    // Create transaction client wrapper
    const transactionClient: TransactionClient = {
      query: <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
        queryWithClient<R>(client, text, params),
      release: () => client.release(),
    };

    // Execute callback
    const result = await callback(transactionClient);

    // Commit transaction
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

/**
 * Get a client from the pool for manual transaction management
 * Remember to call release() when done!
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Execute multiple queries in sequence (not a transaction)
 * Use transaction() if you need atomicity
 */
export async function executeQueries(
  queries: Array<{ text: string; params?: unknown[] }>
): Promise<QueryResult<QueryResultRow>[]> {
  const results: QueryResult<QueryResultRow>[] = [];
  for (const { text, params } of queries) {
    const result = await query(text, params);
    results.push(result);
  }
  return results;
}

/**
 * Check if a database error is a constraint violation
 */
export function isConstraintError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string };
    // PostgreSQL error codes for constraints
    return (
      pgError.code === '23505' || // unique_violation
      pgError.code === '23503' || // foreign_key_violation
      pgError.code === '23514' // check_violation
    );
  }
  return false;
}

/**
 * Get a user-friendly error message from a database error
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; detail?: string; message?: string };
    switch (pgError.code) {
      case '23505': // unique_violation
        return 'This record already exists';
      case '23503': // foreign_key_violation
        return 'Referenced record does not exist';
      case '23514': // check_violation
        return pgError.detail || 'Data validation failed';
      case '23502': // not_null_violation
        return 'Required field is missing';
      default:
        return pgError.message || 'Database operation failed';
    }
  }
  return error instanceof Error ? error.message : 'Unknown database error';
}
