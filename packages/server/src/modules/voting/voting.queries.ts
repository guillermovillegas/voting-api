/**
 * Voting Database Queries
 *
 * SQL queries for vote submission, private notes, and rankings.
 * All queries use parameterized statements for security.
 *
 * OWNERSHIP: AGENT_VOTING
 */

import { query } from '../../core/db/client';
import type { VoteRow, PrivateNoteRow } from '../../core/db/types';

// ============================================================================
// VOTE QUERIES
// ============================================================================

/**
 * Submit a vote (insert or update)
 */
export interface SubmitVoteInput {
  userId: string;
  teamId: string;
  isFinalVote: boolean;
  publicNote?: string | null;
}

export async function submitVote(input: SubmitVoteInput): Promise<VoteRow> {
  // Check if there's an existing non-final vote for this user-team combination
  const existing = await query<VoteRow>(
    `SELECT id, user_id, team_id, is_final_vote, public_note, submitted_at
     FROM votes
     WHERE user_id = $1 AND team_id = $2 AND is_final_vote = FALSE`,
    [input.userId, input.teamId]
  );

  if (existing.rows.length > 0 && existing.rows[0]) {
    // Update existing vote
    const result = await query<VoteRow>(
      `UPDATE votes
       SET is_final_vote = $1, public_note = $2, submitted_at = NOW()
       WHERE id = $3
       RETURNING id, user_id, team_id, is_final_vote, public_note, submitted_at`,
      [input.isFinalVote, input.publicNote || null, existing.rows[0].id]
    );
    if (!result.rows[0]) {
      throw new Error('Failed to update vote');
    }
    return result.rows[0];
  } else {
    // Insert new vote
    const result = await query<VoteRow>(
      `INSERT INTO votes (user_id, team_id, is_final_vote, public_note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, team_id, is_final_vote, public_note, submitted_at`,
      [input.userId, input.teamId, input.isFinalVote, input.publicNote || null]
    );
    if (!result.rows[0]) {
      throw new Error('Failed to create vote');
    }
    return result.rows[0];
  }
}

/**
 * Get all votes for a user
 */
export async function getUserVotes(userId: string): Promise<VoteRow[]> {
  const result = await query<VoteRow>(
    `SELECT id, user_id, team_id, is_final_vote, public_note, submitted_at
     FROM votes
     WHERE user_id = $1
     ORDER BY submitted_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get user's final vote
 */
export async function getFinalVote(userId: string): Promise<VoteRow | null> {
  const result = await query<VoteRow>(
    `SELECT id, user_id, team_id, is_final_vote, public_note, submitted_at
     FROM votes
     WHERE user_id = $1 AND is_final_vote = TRUE
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Get vote count for a team (final votes only)
 */
export async function getVoteCount(teamId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM votes
     WHERE team_id = $1 AND is_final_vote = TRUE`,
    [teamId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Check if user has already cast a final vote
 */
export async function hasFinalVote(userId: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM votes WHERE user_id = $1 AND is_final_vote = TRUE
     ) as exists`,
    [userId]
  );
  return result.rows[0]?.exists || false;
}

/**
 * Check if user has voted for a specific team
 */
export async function hasVotedForTeam(userId: string, teamId: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM votes WHERE user_id = $1 AND team_id = $2
     ) as exists`,
    [userId, teamId]
  );
  return result.rows[0]?.exists || false;
}

// ============================================================================
// PRIVATE NOTE QUERIES
// ============================================================================

/**
 * Update or create a private note
 */
export interface UpdatePrivateNoteInput {
  userId: string;
  teamId: string;
  note: string;
  ranking: number;
}

export async function updatePrivateNote(
  input: UpdatePrivateNoteInput
): Promise<PrivateNoteRow> {
  const result = await query<PrivateNoteRow>(
    `INSERT INTO private_notes (user_id, team_id, note, ranking, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, team_id)
     DO UPDATE SET
       note = EXCLUDED.note,
       ranking = EXCLUDED.ranking,
       updated_at = NOW()
     RETURNING id, user_id, team_id, note, ranking, updated_at`,
    [input.userId, input.teamId, input.note, input.ranking]
  );
  if (!result.rows[0]) {
    throw new Error('Failed to update private note');
  }
  return result.rows[0];
}

/**
 * Get all private notes for a user
 */
export async function getPrivateNotes(userId: string): Promise<PrivateNoteRow[]> {
  const result = await query<PrivateNoteRow>(
    `SELECT id, user_id, team_id, note, ranking, updated_at
     FROM private_notes
     WHERE user_id = $1
     ORDER BY ranking DESC, updated_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a specific private note
 */
export async function getPrivateNote(
  userId: string,
  teamId: string
): Promise<PrivateNoteRow | null> {
  const result = await query<PrivateNoteRow>(
    `SELECT id, user_id, team_id, note, ranking, updated_at
     FROM private_notes
     WHERE user_id = $1 AND team_id = $2`,
    [userId, teamId]
  );
  return result.rows[0] || null;
}

// ============================================================================
// RANKING QUERIES
// ============================================================================

/**
 * Get user's rankings with team information
 * Returns teams that have presented, with user's notes and vote status
 */
export interface UserRankingResult {
  team_id: string;
  team_name: string;
  ranking: number;
  note: string;
  has_voted: boolean;
}

export async function getUserRankings(userId: string): Promise<UserRankingResult[]> {
  const result = await query<UserRankingResult>(
    `SELECT
       t.id as team_id,
       t.name as team_name,
       COALESCE(pn.ranking, 0) as ranking,
       COALESCE(pn.note, '') as note,
       EXISTS(
         SELECT 1 FROM votes v
         WHERE v.user_id = $1 AND v.team_id = t.id
       ) as has_voted
     FROM teams t
     LEFT JOIN private_notes pn ON pn.user_id = $1 AND pn.team_id = t.id
     WHERE t.has_presented = TRUE
     ORDER BY
       COALESCE(pn.ranking, 0) DESC,
       t.name ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get user's final vote team ID
 */
export async function getFinalVoteTeamId(userId: string): Promise<string | null> {
  const result = await query<{ team_id: string }>(
    `SELECT team_id
     FROM votes
     WHERE user_id = $1 AND is_final_vote = TRUE
     LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.team_id || null;
}

// ============================================================================
// EXPORT QUERIES (for downloading notes)
// ============================================================================

/**
 * Get user's notes with team names for export
 */
export interface UserNotesExport {
  team_name: string;
  ranking: number;
  note: string;
  is_final_vote: boolean;
  updated_at: Date;
}

export async function getUserNotesForExport(userId: string): Promise<UserNotesExport[]> {
  const result = await query<UserNotesExport>(
    `SELECT
       t.name as team_name,
       COALESCE(pn.ranking, 0) as ranking,
       COALESCE(pn.note, '') as note,
       EXISTS(SELECT 1 FROM votes v WHERE v.user_id = $1 AND v.team_id = t.id AND v.is_final_vote = TRUE) as is_final_vote,
       COALESCE(pn.updated_at, t.created_at) as updated_at
     FROM teams t
     LEFT JOIN private_notes pn ON pn.user_id = $1 AND pn.team_id = t.id
     WHERE t.has_presented = TRUE
     ORDER BY COALESCE(pn.ranking, 0) DESC, t.name ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get user's vote with team name
 */
export interface UserVoteWithTeam {
  vote_id: string;
  team_id: string;
  team_name: string;
  is_final_vote: boolean;
  public_note: string | null;
  submitted_at: Date;
}

export async function getUserVotesWithTeams(userId: string): Promise<UserVoteWithTeam[]> {
  const result = await query<UserVoteWithTeam>(
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
