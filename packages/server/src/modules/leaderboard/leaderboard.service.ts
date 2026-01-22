/**
 * Leaderboard Service
 *
 * OWNERSHIP: AGENT_LEADER
 * Handles ranking calculation and tie handling for the leaderboard
 */

import type { LeaderboardEntry, TeamId } from '@priv/types';
import * as leaderboardQueries from './leaderboard.queries';
import type { LeaderboardEntryRow } from './leaderboard.queries';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function rowToLeaderboardEntry(row: LeaderboardEntryRow): LeaderboardEntry {
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    voteCount: row.vote_count,
    rank: row.rank,
    hasPresented: row.has_presented,
  };
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get the current leaderboard with rankings
 * Rankings are calculated in the database using DENSE_RANK for proper tie handling
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const entries = await leaderboardQueries.getLeaderboardEntries();
  return entries.map(rowToLeaderboardEntry);
}

/**
 * Register or update a team's data
 * Note: Teams are managed through the teams service, this is for compatibility
 */
export async function registerTeam(_data: {
  teamId: string;
  teamName: string;
  voteCount?: number;
  hasPresented?: boolean;
}): Promise<void> {
  // Teams are managed through teams service
  // This function is kept for compatibility but doesn't need to do anything
  // as teams are already in the database
}

/**
 * Increment vote count for a team
 * Note: Votes are managed through voting service, this just returns updated leaderboard
 */
export async function incrementVote(_teamId: TeamId): Promise<LeaderboardEntry[]> {
  // Vote count is calculated from database, just return updated leaderboard
  return getLeaderboard();
}

/**
 * Decrement vote count for a team (e.g., vote retraction)
 * Note: Votes are managed through voting service, this just returns updated leaderboard
 */
export async function decrementVote(_teamId: TeamId): Promise<LeaderboardEntry[]> {
  // Vote count is calculated from database, just return updated leaderboard
  return getLeaderboard();
}

/**
 * Update team's presentation status
 * Note: Teams are managed through teams service
 */
export async function markTeamAsPresented(_teamId: TeamId): Promise<LeaderboardEntry[]> {
  // Teams are managed through teams service
  // This function is kept for compatibility but the actual update should be done via teams service
  return getLeaderboard();
}

/**
 * Reset all votes (for new voting session)
 * Note: This would require deleting votes from database - use with caution
 */
export async function resetVotes(): Promise<void> {
  // This would require a database operation to delete all votes
  // For now, this is a no-op as votes should be managed through proper admin functions
  console.warn('resetVotes called - votes should be managed through proper admin functions');
}

/**
 * Clear all team data
 * Note: Teams are managed through teams service
 */
export async function clearAllTeams(): Promise<void> {
  // Teams are managed through teams service
  // This function is kept for compatibility but doesn't need to do anything
}

/**
 * Get a single team's entry
 */
export async function getTeamEntry(teamId: TeamId): Promise<LeaderboardEntry | null> {
  const entry = await leaderboardQueries.getTeamLeaderboardEntry(teamId);
  return entry ? rowToLeaderboardEntry(entry) : null;
}

/**
 * Get leaderboard statistics
 */
export async function getLeaderboardStats() {
  return await leaderboardQueries.getLeaderboardStats();
}

export const leaderboardService = {
  getLeaderboard,
  registerTeam,
  incrementVote,
  decrementVote,
  markTeamAsPresented,
  resetVotes,
  clearAllTeams,
  getTeamEntry,
  getLeaderboardStats,
};
