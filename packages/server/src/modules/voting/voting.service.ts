/**
 * Voting Service
 *
 * Handles vote submission, validation, and ranking retrieval.
 * Implements self-vote prevention and vote state management.
 */

import { z } from 'zod';
import type { UserId, TeamId, Vote, PrivateNote, ApiResponse } from '@voting/shared';
import type {
  SubmitVoteRequest,
  VoteSubmitResponse,
  RankingsResponse,
  UserRanking,
  UpdatePrivateNoteRequest,
  VoteValidationResult,
  VoteValidationError,
  VotingContext,
} from './voting.types';
import * as votingQueries from './voting.queries';
import * as teamsQueries from '../teams/teams.queries';
import type { VoteRow, PrivateNoteRow } from '../../core/db/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const submitVoteSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  isFinalVote: z.boolean(),
  publicNote: z.string().max(500, 'Note must be 500 characters or less').nullable().optional(),
});

export const updatePrivateNoteSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  note: z.string().max(1000, 'Note must be 1000 characters or less'),
  ranking: z.number().int().min(1).max(100),
});

// ============================================================================
// VOTING STATE (Simple flag - could be moved to database config table)
// ============================================================================

let votingOpen = true;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function rowToVote(row: VoteRow): Vote {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    isFinalVote: row.is_final_vote,
    publicNote: row.public_note,
    submittedAt: row.submitted_at,
  };
}

function rowToPrivateNote(row: PrivateNoteRow): PrivateNote {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    note: row.note,
    ranking: row.ranking,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export async function validateVote(
  request: SubmitVoteRequest,
  context: VotingContext
): Promise<VoteValidationResult> {
  // Check if voting is open
  if (!votingOpen) {
    return { isValid: false, error: 'VOTING_CLOSED' };
  }

  // Check if team exists and has presented
  const team = await teamsQueries.getTeamById(request.teamId);
  if (!team) {
    return { isValid: false, error: 'TEAM_NOT_FOUND' };
  }

  if (!team.has_presented) {
    return { isValid: false, error: 'TEAM_NOT_PRESENTED' };
  }

  // Prevent self-voting: user cannot vote for their own team
  if (context.userTeamId && context.userTeamId === request.teamId) {
    return { isValid: false, error: 'SELF_VOTE_NOT_ALLOWED' };
  }

  // Check if user is a member of the team they're trying to vote for
  const userTeamId = await teamsQueries.getUserTeamId(context.userId);
  if (userTeamId === request.teamId) {
    return { isValid: false, error: 'SELF_VOTE_NOT_ALLOWED' };
  }

  // Check if user has already cast a final vote
  if (request.isFinalVote) {
    const hasFinal = await votingQueries.hasFinalVote(context.userId);
    if (hasFinal) {
      return { isValid: false, error: 'ALREADY_VOTED_FINAL' };
    }
  }

  return { isValid: true };
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

export async function submitVote(
  request: SubmitVoteRequest,
  context: VotingContext
): Promise<ApiResponse<VoteSubmitResponse>> {
  // Validate input schema
  const parseResult = submitVoteSchema.safeParse(request);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message ?? 'Invalid request',
    };
  }

  // Validate vote rules
  const validation = await validateVote(request, context);
  if (!validation.isValid) {
    return {
      success: false,
      error: getValidationErrorMessage(validation.error!),
    };
  }

  // Check for existing non-final vote
  const existingVote = await votingQueries.getUserVotes(context.userId);
  const existingNonFinal = existingVote.find(
    (v) => v.team_id === request.teamId && !v.is_final_vote
  );

  const isNew = !existingNonFinal;

  // Submit vote to database
  const voteRow = await votingQueries.submitVote({
    userId: context.userId,
    teamId: request.teamId,
    isFinalVote: request.isFinalVote,
    publicNote: request.publicNote ?? null,
  });

  const vote = rowToVote(voteRow);

  return {
    success: true,
    data: { vote, isNew },
  };
}

export async function getUserRankings(
  userId: UserId
): Promise<ApiResponse<RankingsResponse>> {
  // Get rankings from database
  const rankings = await votingQueries.getUserRankings(userId);
  const finalVoteTeamId = await votingQueries.getFinalVoteTeamId(userId);

  const userNotes: UserRanking[] = rankings.map((r) => ({
    teamId: r.team_id,
    teamName: r.team_name,
    ranking: r.ranking,
    note: r.note,
    hasVoted: r.has_voted,
  }));

  return {
    success: true,
    data: { rankings: userNotes, finalVoteTeamId },
  };
}

export async function updatePrivateNote(
  request: UpdatePrivateNoteRequest,
  userId: UserId
): Promise<ApiResponse<PrivateNote>> {
  // Validate input schema
  const parseResult = updatePrivateNoteSchema.safeParse(request);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message ?? 'Invalid request',
    };
  }

  // Check if team exists
  const team = await teamsQueries.getTeamById(request.teamId);
  if (!team) {
    return {
      success: false,
      error: 'Team not found',
    };
  }

  // Update or create private note
  const noteRow = await votingQueries.updatePrivateNote({
    userId,
    teamId: request.teamId,
    note: request.note,
    ranking: request.ranking,
  });

  const privateNote = rowToPrivateNote(noteRow);

  return {
    success: true,
    data: privateNote,
  };
}

export async function getVoteCount(teamId: TeamId): Promise<number> {
  return await votingQueries.getVoteCount(teamId);
}

export async function setVotingOpen(isOpen: boolean): Promise<void> {
  votingOpen = isOpen;
}

export async function isVotingOpen(): Promise<boolean> {
  return votingOpen;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

export async function registerTeam(
  _id: TeamId,
  name: string,
  _memberIds: UserId[]
): Promise<void> {
  // This should use teams service, but keeping for compatibility
  await teamsQueries.createTeam({ name });
  // Member assignment would be done separately
}

export async function markTeamAsPresented(teamId: TeamId): Promise<boolean> {
  try {
    await teamsQueries.updateTeam(teamId, { hasPresented: true });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getValidationErrorMessage(error: VoteValidationError): string {
  const messages: Record<VoteValidationError, string> = {
    SELF_VOTE_NOT_ALLOWED: 'You cannot vote for your own team',
    TEAM_NOT_FOUND: 'Team not found',
    TEAM_NOT_PRESENTED: 'Team has not presented yet',
    USER_NOT_FOUND: 'User not found',
    ALREADY_VOTED_FINAL: 'You have already cast your final vote',
    VOTING_CLOSED: 'Voting is currently closed',
  };
  return messages[error];
}
