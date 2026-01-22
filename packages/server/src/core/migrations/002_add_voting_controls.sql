-- ============================================================================
-- Migration 002: Add Voting Controls & Missing Features
-- ============================================================================
-- Adds:
-- 1. has_submitted_final_vote flag on users (locks team assignment)
-- 2. voting_settings table for global voting state
-- 3. Self-vote prevention trigger
-- 4. Team member count validation function
-- ============================================================================

-- ============================================================================
-- 1. ADD HAS_SUBMITTED_FINAL_VOTE TO USERS
-- ============================================================================
-- This flag locks team assignment after a user submits their final vote

ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_submitted_final_vote BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick lookup of users who have voted
CREATE INDEX IF NOT EXISTS idx_users_has_submitted_final_vote
ON users(has_submitted_final_vote) WHERE has_submitted_final_vote = TRUE;

COMMENT ON COLUMN users.has_submitted_final_vote IS 'True after user submits final vote. Locks team assignment.';

-- ============================================================================
-- 2. VOTING SETTINGS TABLE (Global voting state)
-- ============================================================================
-- Stores global voting configuration

CREATE TABLE IF NOT EXISTS voting_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
    is_voting_open BOOLEAN NOT NULL DEFAULT FALSE,
    lock_votes_during_presentation BOOLEAN NOT NULL DEFAULT TRUE,
    allow_vote_changes BOOLEAN NOT NULL DEFAULT FALSE,
    require_presentation_before_vote BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO voting_settings (id, is_voting_open, lock_votes_during_presentation, allow_vote_changes, require_presentation_before_vote)
VALUES ('global', FALSE, TRUE, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE voting_settings IS 'Global voting configuration settings';
COMMENT ON COLUMN voting_settings.is_voting_open IS 'Whether voting is currently open';
COMMENT ON COLUMN voting_settings.lock_votes_during_presentation IS 'Prevent final votes during active presentation';
COMMENT ON COLUMN voting_settings.allow_vote_changes IS 'Allow users to change their final vote';
COMMENT ON COLUMN voting_settings.require_presentation_before_vote IS 'Only allow voting for teams that have presented';

-- ============================================================================
-- 3. SELF-VOTE PREVENTION TRIGGER
-- ============================================================================
-- Prevents users from voting for their own team

CREATE OR REPLACE FUNCTION prevent_self_vote()
RETURNS TRIGGER AS $$
DECLARE
    voter_team_id UUID;
BEGIN
    -- Get the voter's team_id
    SELECT team_id INTO voter_team_id FROM users WHERE id = NEW.user_id;

    -- If voter has a team and is voting for their own team, reject
    IF voter_team_id IS NOT NULL AND voter_team_id = NEW.team_id THEN
        RAISE EXCEPTION 'Cannot vote for your own team';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS check_self_vote ON votes;
CREATE TRIGGER check_self_vote
    BEFORE INSERT OR UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_vote();

-- ============================================================================
-- 4. UPDATE USER FLAG ON FINAL VOTE TRIGGER
-- ============================================================================
-- Automatically sets has_submitted_final_vote when user submits final vote

CREATE OR REPLACE FUNCTION update_user_vote_flag()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_final_vote = TRUE THEN
        UPDATE users SET has_submitted_final_vote = TRUE WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_voted_flag ON votes;
CREATE TRIGGER set_user_voted_flag
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_vote_flag();

-- ============================================================================
-- 5. TEAM MEMBER COUNT FUNCTION
-- ============================================================================
-- Helper function to check team member count

CREATE OR REPLACE FUNCTION get_team_member_count(p_team_id UUID)
RETURNS INTEGER AS $$
DECLARE
    member_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO member_count FROM users WHERE team_id = p_team_id;
    RETURN member_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. PREVENT TEAM CHANGE AFTER VOTE TRIGGER
-- ============================================================================
-- Prevents team_id changes on users who have submitted final vote

CREATE OR REPLACE FUNCTION prevent_team_change_after_vote()
RETURNS TRIGGER AS $$
BEGIN
    -- If user has voted and team_id is being changed
    IF OLD.has_submitted_final_vote = TRUE AND
       (OLD.team_id IS DISTINCT FROM NEW.team_id) THEN
        RAISE EXCEPTION 'Cannot change team assignment after submitting final vote';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_team_change_after_vote ON users;
CREATE TRIGGER check_team_change_after_vote
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_team_change_after_vote();

-- ============================================================================
-- 7. USEFUL VIEWS FOR FRONTEND
-- ============================================================================

-- View: Teams with member counts
CREATE OR REPLACE VIEW teams_with_counts AS
SELECT
    t.id,
    t.name,
    t.presentation_order,
    t.has_presented,
    t.created_at,
    COUNT(u.id) as member_count,
    ARRAY_AGG(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
        FILTER (WHERE u.id IS NOT NULL) as members
FROM teams t
LEFT JOIN users u ON u.team_id = t.id
GROUP BY t.id, t.name, t.presentation_order, t.has_presented, t.created_at;

-- View: Leaderboard with ranks (real-time)
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
    t.id as team_id,
    t.name as team_name,
    t.has_presented,
    COUNT(v.id) as vote_count,
    DENSE_RANK() OVER (ORDER BY COUNT(v.id) DESC) as rank
FROM teams t
LEFT JOIN votes v ON v.team_id = t.id AND v.is_final_vote = TRUE
WHERE t.has_presented = TRUE
GROUP BY t.id, t.name, t.has_presented
ORDER BY vote_count DESC, t.name ASC;

-- View: User voting status
CREATE OR REPLACE VIEW user_voting_status AS
SELECT
    u.id as user_id,
    u.email,
    u.name,
    u.team_id,
    t.name as team_name,
    u.has_submitted_final_vote,
    v.team_id as voted_for_team_id,
    vt.name as voted_for_team_name,
    v.public_note,
    v.submitted_at as vote_submitted_at
FROM users u
LEFT JOIN teams t ON t.id = u.team_id
LEFT JOIN votes v ON v.user_id = u.id AND v.is_final_vote = TRUE
LEFT JOIN teams vt ON vt.id = v.team_id
WHERE u.role = 'voter';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION prevent_self_vote() IS 'Trigger function to prevent users from voting for their own team';
COMMENT ON FUNCTION update_user_vote_flag() IS 'Trigger function to set has_submitted_final_vote flag';
COMMENT ON FUNCTION prevent_team_change_after_vote() IS 'Trigger function to lock team assignment after voting';
COMMENT ON FUNCTION get_team_member_count(UUID) IS 'Returns the number of members in a team';
COMMENT ON VIEW teams_with_counts IS 'Teams with their member counts and member details';
COMMENT ON VIEW leaderboard_view IS 'Real-time leaderboard with rankings';
COMMENT ON VIEW user_voting_status IS 'User voting status for admin dashboard';
