/**
 * Database Migration System
 *
 * Executes SQL migration files in order and tracks applied migrations.
 * Migrations are stored in the migrations/ directory and executed sequentially.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { query, transaction } from '../db/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Migration {
  version: string;
  name: string;
  sql: string;
}

export interface AppliedMigration {
  version: string;
  name: string;
  applied_at: Date;
}

// ============================================================================
// MIGRATION TRACKING
// ============================================================================

/**
 * Ensure schema_migrations table exists
 */
async function ensureMigrationsTable(): Promise<void> {
  const migrationsTableSQL = readFileSync(
    join(__dirname, 'schema_migrations.sql'),
    'utf-8'
  );
  await query(migrationsTableSQL);
}

/**
 * Get list of applied migrations
 */
export async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  await ensureMigrationsTable();
  const result = await query<AppliedMigration>(
    'SELECT version, name, applied_at FROM schema_migrations ORDER BY applied_at ASC'
  );
  return result.rows;
}

// recordMigration is now handled within transaction in runMigrations()

// ============================================================================
// MIGRATION LOADING
// ============================================================================

/**
 * Load all migration files from the migrations directory
 */
function loadMigrations(): Migration[] {
  const migrationsDir = join(__dirname);
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && file !== 'schema_migrations.sql')
    .sort(); // Sort alphabetically (001, 002, etc.)

  return files.map((file) => {
    const version = file.replace('.sql', '');
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    const extractedName = extractMigrationName(sql);
    const name = extractedName || version;

    return {
      version,
      name,
      sql,
    };
  });
}

/**
 * Extract migration name from SQL comment if present
 */
function extractMigrationName(sql: string): string | null {
  const match = sql.match(/--\s*name:\s*(.+)/i);
  return match && match[1] ? match[1].trim() : null;
}

// ============================================================================
// MIGRATION EXECUTION
// ============================================================================

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...');

  // Ensure migrations table exists
  await ensureMigrationsTable();

  // Get applied migrations
  const applied = await getAppliedMigrations();
  const appliedVersions = new Set(applied.map((m) => m.version));

  // Load all migration files
  const migrations = loadMigrations();

  // Filter to only pending migrations
  const pending = migrations.filter((m) => !appliedVersions.has(m.version));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  console.log(`Found ${pending.length} pending migration(s):`);
  pending.forEach((m) => console.log(`  - ${m.version}: ${m.name}`));

  // Execute each pending migration in a transaction
  for (const migration of pending) {
    try {
      console.log(`Applying migration ${migration.version}...`);

      await transaction(async (client) => {
        // Execute the migration SQL
        await client.query(migration.sql);

        // Record the migration
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
        );
      });

      console.log(`✓ Migration ${migration.version} applied successfully`);
    } catch (error) {
      console.error(`✗ Failed to apply migration ${migration.version}:`, error);
      throw error;
    }
  }

  console.log('All migrations completed successfully.');
}

/**
 * Get migration status (applied vs pending)
 */
export async function getMigrationStatus(): Promise<{
  applied: AppliedMigration[];
  pending: Migration[];
}> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const appliedVersions = new Set(applied.map((m) => m.version));

  const allMigrations = loadMigrations();
  const pending = allMigrations.filter((m) => !appliedVersions.has(m.version));

  return {
    applied,
    pending,
  };
}

/**
 * Rollback a specific migration (manual operation)
 * WARNING: This does not automatically rollback - you must provide rollback SQL
 */
export async function rollbackMigration(version: string): Promise<void> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const migration = applied.find((m) => m.version === version);

  if (!migration) {
    throw new Error(`Migration ${version} not found in applied migrations`);
  }

  console.warn(
    `WARNING: Rollback for ${version} requires manual SQL. ` +
      `Remove from schema_migrations table if needed.`
  );

  // For now, just remove from tracking (actual rollback SQL should be manual)
  await query('DELETE FROM schema_migrations WHERE version = $1', [version]);
  console.log(`Removed migration ${version} from tracking`);
}
