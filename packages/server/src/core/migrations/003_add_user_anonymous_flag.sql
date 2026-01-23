-- ============================================================================
-- Add is_anonymous Flag to Users Table
-- ============================================================================
-- This migration adds support for training mode authentication using
-- X-User-Id header. Users created this way are marked as anonymous/training.
--
-- OWNERSHIP: AGENT_INFRA
-- ============================================================================

-- Add is_anonymous column to track training users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for querying anonymous users (for cleanup purposes)
CREATE INDEX IF NOT EXISTS idx_users_is_anonymous ON users(is_anonymous);

-- Allow empty passwords for anonymous/training users
-- (The NOT NULL constraint is kept, but empty strings are allowed)
-- No change needed - empty strings already work with VARCHAR NOT NULL

-- Add comment for documentation
COMMENT ON COLUMN users.is_anonymous IS 'True for users created via X-User-Id header (training mode)';
