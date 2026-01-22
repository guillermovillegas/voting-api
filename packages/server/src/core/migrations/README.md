# Database Migrations

This directory contains SQL migration files that are executed in order to set up and update the database schema.

## Migration Files

- `schema_migrations.sql` - Creates the migration tracking table
- `001_initial_schema.sql` - Initial database schema with all tables, indexes, and constraints

## Running Migrations

Migrations are automatically run when the application starts, or can be run manually:

```typescript
import { runMigrations } from './core/migrations';

// Run all pending migrations
await runMigrations();
```

## Migration Status

Check which migrations have been applied:

```typescript
import { getMigrationStatus } from './core/migrations';

const status = await getMigrationStatus();
console.log('Applied:', status.applied);
console.log('Pending:', status.pending);
```

## Creating New Migrations

1. Create a new SQL file with format: `XXX_description.sql` (e.g., `002_add_indexes.sql`)
2. Files are executed in alphabetical order
3. Add a comment at the top: `-- name: Description of migration`
4. The migration system will automatically track applied migrations

## Migration Naming Convention

- Use sequential numbers: `001_`, `002_`, `003_`, etc.
- Use descriptive names: `001_initial_schema.sql`, `002_add_user_indexes.sql`
- Keep migrations small and focused on one change

## Important Notes

- Migrations are executed in transactions - if one fails, it rolls back
- Never modify an already-applied migration file
- Always test migrations on a development database first
- Back up production data before running migrations
