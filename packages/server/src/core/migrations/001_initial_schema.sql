-- ============================================================================
-- Initial Database Schema for Hackathon Voting App
-- ============================================================================
-- This migration creates all tables, indexes, constraints, and triggers
-- needed for the voting application.
--
-- OWNERSHIP: AGENT_INFRA
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Note: gen_random_uuid() is built into PostgreSQL 13+ and doesn't require extensions
-- Azure PostgreSQL doesn't allow uuid-ossp extension for regular users

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'voter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Presentation status
DO $$ BEGIN
    CREATE TYPE presentation_status AS ENUM ('upcoming', 'current', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Teams Table (created first due to foreign key dependency)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    presentation_order INTEGER,
    has_presented BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'voter',
    team_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint for users.team_id after teams table exists
ALTER TABLE users
    ADD CONSTRAINT fk_users_team_id
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Presentations Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    status presentation_status NOT NULL DEFAULT 'upcoming',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Votes Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    is_final_vote BOOLEAN NOT NULL DEFAULT FALSE,
    public_note TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Private Notes Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    note TEXT NOT NULL DEFAULT '',
    ranking INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Timer State Table (Single Global Timer)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timer_state (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    duration_seconds INTEGER NOT NULL DEFAULT 300,
    started_at TIMESTAMP,
    paused_at TIMESTAMP,
    elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    presentation_id UUID REFERENCES presentations(id) ON DELETE SET NULL
);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- One final vote per user constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_one_final_vote_per_user
    ON votes(user_id, is_final_vote)
    WHERE is_final_vote = TRUE;

-- One private note per user-team combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_private_notes_user_team
    ON private_notes(user_id, team_id);

-- Prevent self-voting: Check constraint to ensure user cannot vote for their own team
-- This is enforced at the application level, but we add a comment for documentation
COMMENT ON TABLE votes IS 'Votes table. Application enforces that user cannot vote for their own team.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_presentation_order ON teams(presentation_order);
CREATE INDEX IF NOT EXISTS idx_teams_has_presented ON teams(has_presented);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_team_id ON votes(team_id);
CREATE INDEX IF NOT EXISTS idx_votes_is_final_vote ON votes(is_final_vote);
CREATE INDEX IF NOT EXISTS idx_votes_submitted_at ON votes(submitted_at);

-- Private notes indexes
CREATE INDEX IF NOT EXISTS idx_private_notes_user_id ON private_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_private_notes_team_id ON private_notes(team_id);

-- Presentations indexes
CREATE INDEX IF NOT EXISTS idx_presentations_team_id ON presentations(team_id);
CREATE INDEX IF NOT EXISTS idx_presentations_status ON presentations(status);

-- Timer state indexes
CREATE INDEX IF NOT EXISTS idx_timer_state_presentation_id ON timer_state(presentation_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables that need it
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_private_notes_updated_at ON private_notes;
CREATE TRIGGER update_private_notes_updated_at
    BEFORE UPDATE ON private_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert initial timer state if it doesn't exist
INSERT INTO timer_state (id, is_active, duration_seconds, elapsed_seconds)
VALUES ('global', FALSE, 300, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'Application users (admins and voters)';
COMMENT ON TABLE teams IS 'Hackathon teams (3-6 members each)';
COMMENT ON TABLE presentations IS 'Team presentations with status tracking';
COMMENT ON TABLE votes IS 'User votes for teams. One final vote per user enforced.';
COMMENT ON TABLE private_notes IS 'Private notes and rankings (not shared)';
COMMENT ON TABLE timer_state IS 'Single global timer state for presentations';

COMMENT ON COLUMN users.role IS 'User role: admin or voter';
COMMENT ON COLUMN users.team_id IS 'Team assignment (nullable for admins)';
COMMENT ON COLUMN teams.presentation_order IS 'Order in which team will present (nullable until randomized)';
COMMENT ON COLUMN teams.has_presented IS 'Whether team has completed their presentation';
COMMENT ON COLUMN votes.is_final_vote IS 'True if this is the user''s final vote (one per user)';
COMMENT ON COLUMN votes.public_note IS 'Optional public note explaining why team was chosen';
COMMENT ON COLUMN private_notes.ranking IS 'User''s personal ranking of this team';
COMMENT ON COLUMN timer_state.id IS 'Always ''global'' - single timer instance';
COMMENT ON COLUMN timer_state.duration_seconds IS 'Fixed duration for all presentations (default 300 = 5 minutes)';
