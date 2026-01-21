/**
 * Voting Module - Local Types
 *
 * Internal types for the voting service.
 * Shared types are imported from @voting/shared
 */

import type { UserId, TeamId, VoteId, Vote, PrivateNote } from '@voting/shared';

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface SubmitVoteRequest {
  teamId: TeamId;
  isFinalVote: boolean;
  publicNote?: string | null;
}

export interface GetRankingsRequest {
  userId: UserId;
}

export interface UpdatePrivateNoteRequest {
  teamId: TeamId;
  note: string;
  ranking: number;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface VoteSubmitResponse {
  vote: Vote;
  isNew: boolean;
}

export interface UserRanking {
  teamId: TeamId;
  teamName: string;
  ranking: number;
  note: string;
  hasVoted: boolean;
}

export interface RankingsResponse {
  rankings: UserRanking[];
  finalVoteTeamId: TeamId | null;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface VoteValidationResult {
  isValid: boolean;
  error?: VoteValidationError;
}

export type VoteValidationError =
  | 'SELF_VOTE_NOT_ALLOWED'
  | 'TEAM_NOT_FOUND'
  | 'TEAM_NOT_PRESENTED'
  | 'USER_NOT_FOUND'
  | 'ALREADY_VOTED_FINAL'
  | 'VOTING_CLOSED';

// ============================================================================
// SERVICE CONTEXT
// ============================================================================

export interface VotingContext {
  userId: UserId;
  userTeamId: TeamId | null;
  isAdmin: boolean;
}
