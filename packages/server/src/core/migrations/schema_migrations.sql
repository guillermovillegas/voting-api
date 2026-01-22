-- ============================================================================
-- Schema Migrations Tracking Table
-- ============================================================================
-- This table tracks which migrations have been applied to the database.
--
-- OWNERSHIP: AGENT_INFRA
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);

COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations';
