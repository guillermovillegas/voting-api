/**
 * Admin Database Queries
 *
 * Complex queries for admin operations, statistics, and exports.
 * All queries use parameterized statements for security.
 *
 * OWNERSHIP: AGENT_ADMIN
 */

import { query, transaction } from '../../core/db/client';

// ============================================================================
// VOTE QUERIES
// ============================================================================

/**
 * Get all votes with user and team information
 */
export interface VoteWithDetails {
  vote_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  team_id: string;
  team_name: string;
  is_final_vote: boolean;
  public_note: string | null;
  submitted_at: Date;
}

export async function getAllVotes(): Promise<VoteWithDetails[]> {
  const result = await query<VoteWithDetails>(
    `SELECT
       v.id as vote_id,
       v.user_id,
       u.email as user_email,
       u.name as user_name,
       v.team_id,
       t.name as team_name,
       v.is_final_vote,
       v.public_note,
       v.submitted_at
     FROM votes v
     JOIN users u ON u.id = v.user_id
     JOIN teams t ON t.id = v.team_id
     ORDER BY v.submitted_at DESC`
  );
  return result.rows;
}

/**
 * Get vote statistics
 */
export interface VoteStatistics {
  totalVotes: number;
  finalVotes: number;
  nonFinalVotes: number;
  votesPerTeam: Array<{ teamId: string; teamName: string; count: number }>;
  votesPerUser: number;
  averageVotesPerUser: number;
}

export async function getVoteStatistics(): Promise<VoteStatistics> {
  const [totalResult, finalResult, nonFinalResult, perTeamResult, perUserResult] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) as count FROM votes'),
    query<{ count: string }>("SELECT COUNT(*) as count FROM votes WHERE is_final_vote = TRUE"),
    query<{ count: string }>("SELECT COUNT(*) as count FROM votes WHERE is_final_vote = FALSE"),
    query<{ team_id: string; team_name: string; count: string }>(
      `SELECT t.id as team_id, t.name as team_name, COUNT(v.id) as count
       FROM teams t
       LEFT JOIN votes v ON v.team_id = t.id AND v.is_final_vote = TRUE
       GROUP BY t.id, t.name
       ORDER BY count DESC`
    ),
    query<{ user_id: string; count: string }>(
      `SELECT user_id, COUNT(*) as count
       FROM votes
       WHERE is_final_vote = TRUE
       GROUP BY user_id`
    ),
  ]);

  const totalVotes = parseInt(totalResult.rows[0]?.count || '0', 10);
  const finalVotes = parseInt(finalResult.rows[0]?.count || '0', 10);
  const nonFinalVotes = parseInt(nonFinalResult.rows[0]?.count || '0', 10);

  const votesPerTeam = perTeamResult.rows.map((row) => ({
    teamId: row.team_id,
    teamName: row.team_name,
    count: parseInt(row.count || '0', 10),
  }));

  const votesPerUser = perUserResult.rows.length;
  const averageVotesPerUser = votesPerUser > 0 ? finalVotes / votesPerUser : 0;

  return {
    totalVotes,
    finalVotes,
    nonFinalVotes,
    votesPerTeam,
    votesPerUser,
    averageVotesPerUser,
  };
}

/**
 * Get vote history for a specific user
 */
export interface UserVoteHistory {
  vote_id: string;
  team_id: string;
  team_name: string;
  is_final_vote: boolean;
  public_note: string | null;
  submitted_at: Date;
}

export async function getUserVoteHistory(userId: string): Promise<UserVoteHistory[]> {
  const result = await query<UserVoteHistory>(
    `SELECT
       v.id as vote_id,
       v.team_id,
       t.name as team_name,
       v.is_final_vote,
       v.public_note,
       v.submitted_at
     FROM votes v
     JOIN teams t ON t.id = v.team_id
     WHERE v.user_id = $1
     ORDER BY v.submitted_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get vote details for a specific team
 */
export interface TeamVoteDetails {
  vote_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  is_final_vote: boolean;
  public_note: string | null;
  submitted_at: Date;
}

export async function getTeamVoteDetails(teamId: string): Promise<TeamVoteDetails[]> {
  const result = await query<TeamVoteDetails>(
    `SELECT
       v.id as vote_id,
       v.user_id,
       u.email as user_email,
       u.name as user_name,
       v.is_final_vote,
       v.public_note,
       v.submitted_at
     FROM votes v
     JOIN users u ON u.id = v.user_id
     WHERE v.team_id = $1
     ORDER BY v.submitted_at DESC`,
    [teamId]
  );
  return result.rows;
}

/**
 * Delete all votes (for system reset)
 */
export async function deleteAllVotes(): Promise<void> {
  await query('DELETE FROM votes');
}

/**
 * Delete all private notes (for system reset)
 */
export async function deleteAllPrivateNotes(): Promise<void> {
  await query('DELETE FROM private_notes');
}

// ============================================================================
// SYSTEM STATISTICS
// ============================================================================

/**
 * Get overall system statistics
 */
export interface SystemStatistics {
  totalUsers: number;
  totalTeams: number;
  totalVotes: number;
  totalFinalVotes: number;
  teamsPresented: number;
  teamsNotPresented: number;
  presentationsCompleted: number;
  presentationsInProgress: number;
  presentationsUpcoming: number;
}

export async function getSystemStatistics(): Promise<SystemStatistics> {
  const [
    usersResult,
    teamsResult,
    votesResult,
    finalVotesResult,
    presentedResult,
    notPresentedResult,
    completedPresResult,
    currentPresResult,
    upcomingPresResult,
  ] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) as count FROM users'),
    query<{ count: string }>('SELECT COUNT(*) as count FROM teams'),
    query<{ count: string }>('SELECT COUNT(*) as count FROM votes'),
    query<{ count: string }>("SELECT COUNT(*) as count FROM votes WHERE is_final_vote = TRUE"),
    query<{ count: string }>("SELECT COUNT(*) as count FROM teams WHERE has_presented = TRUE"),
    query<{ count: string }>("SELECT COUNT(*) as count FROM teams WHERE has_presented = FALSE"),
    query<{ count: string }>("SELECT COUNT(*) as count FROM presentations WHERE status = 'completed'"),
    query<{ count: string }>("SELECT COUNT(*) as count FROM presentations WHERE status = 'current'"),
    query<{ count: string }>("SELECT COUNT(*) as count FROM presentations WHERE status = 'upcoming'"),
  ]);

  return {
    totalUsers: parseInt(usersResult.rows[0]?.count || '0', 10),
    totalTeams: parseInt(teamsResult.rows[0]?.count || '0', 10),
    totalVotes: parseInt(votesResult.rows[0]?.count || '0', 10),
    totalFinalVotes: parseInt(finalVotesResult.rows[0]?.count || '0', 10),
    teamsPresented: parseInt(presentedResult.rows[0]?.count || '0', 10),
    teamsNotPresented: parseInt(notPresentedResult.rows[0]?.count || '0', 10),
    presentationsCompleted: parseInt(completedPresResult.rows[0]?.count || '0', 10),
    presentationsInProgress: parseInt(currentPresResult.rows[0]?.count || '0', 10),
    presentationsUpcoming: parseInt(upcomingPresResult.rows[0]?.count || '0', 10),
  };
}
