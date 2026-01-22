/**
 * Leaderboard Database Queries
 *
 * SQL queries for leaderboard calculations with proper tie handling.
 * All queries use parameterized statements for security.
 *
 * OWNERSHIP: AGENT_LEADER
 */

import { query } from '../../core/db/client';

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

export interface LeaderboardEntryRow {
  team_id: string;
  team_name: string;
  vote_count: number;
  rank: number;
  has_presented: boolean;
}

// ============================================================================
// LEADERBOARD QUERIES
// ============================================================================

/**
 * Get leaderboard entries with proper tie handling
 * Teams with the same vote count share the same rank
 * Next rank accounts for ties (e.g., 1, 1, 3 not 1, 1, 2)
 * Only includes teams that have presented
 */
export async function getLeaderboardEntries(): Promise<LeaderboardEntryRow[]> {
  // Use window function to calculate ranks with tie handling
  const result = await query<LeaderboardEntryRow>(
    `WITH vote_counts AS (
       SELECT
         t.id as team_id,
         t.name as team_name,
         t.has_presented,
         COUNT(v.id) FILTER (WHERE v.is_final_vote = TRUE) as vote_count
       FROM teams t
       LEFT JOIN votes v ON v.team_id = t.id
       WHERE t.has_presented = TRUE
       GROUP BY t.id, t.name, t.has_presented
     ),
     ranked AS (
       SELECT
         team_id,
         team_name,
         vote_count,
         has_presented,
         DENSE_RANK() OVER (ORDER BY vote_count DESC) as rank
       FROM vote_counts
     )
     SELECT
       team_id,
       team_name,
       vote_count,
       rank,
       has_presented
     FROM ranked
     ORDER BY rank ASC, team_name ASC`
  );
  return result.rows;
}

/**
 * Get vote count for a specific team (final votes only)
 */
export async function getTeamVoteCount(teamId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM votes
     WHERE team_id = $1 AND is_final_vote = TRUE`,
    [teamId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Get leaderboard entry for a specific team
 */
export async function getTeamLeaderboardEntry(
  teamId: string
): Promise<LeaderboardEntryRow | null> {
  const entries = await getLeaderboardEntries();
  return entries.find((e) => e.team_id === teamId) || null;
}

/**
 * Get total number of votes cast (all final votes)
 */
export async function getTotalVotes(): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM votes
     WHERE is_final_vote = TRUE`
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Get number of teams that have presented
 */
export async function getTeamsPresentedCount(): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM teams
     WHERE has_presented = TRUE`
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Get leaderboard statistics
 */
export interface LeaderboardStats {
  totalTeams: number;
  totalVotes: number;
  teamsPresented: number;
  topTeam: LeaderboardEntryRow | null;
}

export async function getLeaderboardStats(): Promise<LeaderboardStats> {
  const [totalTeams, totalVotes, teamsPresented, entries] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) as count FROM teams'),
    getTotalVotes(),
    getTeamsPresentedCount(),
    getLeaderboardEntries(),
  ]);

  const topTeam = entries.length > 0 && entries[0]?.rank === 1 ? entries[0] : null;

  return {
    totalTeams: parseInt(totalTeams.rows[0]?.count || '0', 10),
    totalVotes,
    teamsPresented,
    topTeam,
  };
}
