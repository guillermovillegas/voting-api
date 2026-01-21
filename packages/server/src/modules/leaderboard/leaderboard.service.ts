/**
 * Leaderboard Service
 *
 * OWNERSHIP: AGENT_LEADER
 * Handles ranking calculation and tie handling for the leaderboard
 */

import { z } from 'zod';
import type { LeaderboardEntry, TeamId } from '@priv/types';

// Validation schemas
const TeamVoteDataSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  voteCount: z.number().int().min(0),
  hasPresented: z.boolean(),
});

type TeamVoteData = z.infer<typeof TeamVoteDataSchema>;

// In-memory store for demo purposes (would use database in production)
const teamVotes = new Map<TeamId, TeamVoteData>();

/**
 * Calculate rankings with proper tie handling
 * Teams with the same vote count share the same rank
 * Next rank accounts for ties (e.g., 1, 1, 3 not 1, 1, 2)
 */
function calculateRankings(teams: TeamVoteData[]): LeaderboardEntry[] {
  // Sort by vote count descending
  const sorted = [...teams].sort((a, b) => b.voteCount - a.voteCount);

  const entries: LeaderboardEntry[] = [];
  let currentRank = 1;
  let previousVoteCount: number | null = null;
  let teamsAtCurrentRank = 0;

  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    if (team === undefined) continue;

    if (previousVoteCount !== null && team.voteCount < previousVoteCount) {
      // Vote count changed, update rank
      currentRank += teamsAtCurrentRank;
      teamsAtCurrentRank = 1;
    } else if (previousVoteCount === null) {
      teamsAtCurrentRank = 1;
    } else {
      // Same vote count, same rank (tie)
      teamsAtCurrentRank++;
    }

    entries.push({
      teamId: team.teamId,
      teamName: team.teamName,
      voteCount: team.voteCount,
      rank: currentRank,
      hasPresented: team.hasPresented,
    });

    previousVoteCount = team.voteCount;
  }

  return entries;
}

/**
 * Get the current leaderboard with rankings
 */
export function getLeaderboard(): LeaderboardEntry[] {
  const teams = Array.from(teamVotes.values());
  return calculateRankings(teams);
}

/**
 * Register or update a team's data
 */
export function registerTeam(data: TeamVoteData): void {
  const validated = TeamVoteDataSchema.parse(data);
  teamVotes.set(validated.teamId, validated);
}

/**
 * Increment vote count for a team
 */
export function incrementVote(teamId: TeamId): LeaderboardEntry[] {
  const team = teamVotes.get(teamId);
  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  team.voteCount++;
  teamVotes.set(teamId, team);

  return getLeaderboard();
}

/**
 * Decrement vote count for a team (e.g., vote retraction)
 */
export function decrementVote(teamId: TeamId): LeaderboardEntry[] {
  const team = teamVotes.get(teamId);
  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  if (team.voteCount > 0) {
    team.voteCount--;
    teamVotes.set(teamId, team);
  }

  return getLeaderboard();
}

/**
 * Update team's presentation status
 */
export function markTeamAsPresented(teamId: TeamId): LeaderboardEntry[] {
  const team = teamVotes.get(teamId);
  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  team.hasPresented = true;
  teamVotes.set(teamId, team);

  return getLeaderboard();
}

/**
 * Reset all votes (for new voting session)
 */
export function resetVotes(): void {
  for (const [teamId, team] of teamVotes) {
    teamVotes.set(teamId, { ...team, voteCount: 0 });
  }
}

/**
 * Clear all team data
 */
export function clearAllTeams(): void {
  teamVotes.clear();
}

/**
 * Get a single team's entry
 */
export function getTeamEntry(teamId: TeamId): LeaderboardEntry | null {
  const leaderboard = getLeaderboard();
  return leaderboard.find((entry) => entry.teamId === teamId) ?? null;
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
};
