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
// IN-MEMORY STORAGE (Replace with database in production)
// ============================================================================

interface StorageState {
  votes: Map<VoteId, Vote>;
  privateNotes: Map<string, PrivateNote>; // key: `${userId}:${teamId}`
  teams: Map<TeamId, { id: TeamId; name: string; hasPresented: boolean; memberIds: UserId[] }>;
  votingOpen: boolean;
}

const storage: StorageState = {
  votes: new Map(),
  privateNotes: new Map(),
  teams: new Map(),
  votingOpen: true,
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateVote(
  request: SubmitVoteRequest,
  context: VotingContext
): VoteValidationResult {
  // Check if voting is open
  if (!storage.votingOpen) {
    return { isValid: false, error: 'VOTING_CLOSED' };
  }

  // Check if team exists
  const team = storage.teams.get(request.teamId);
  if (!team) {
    return { isValid: false, error: 'TEAM_NOT_FOUND' };
  }

  // Check if team has presented
  if (!team.hasPresented) {
    return { isValid: false, error: 'TEAM_NOT_PRESENTED' };
  }

  // Prevent self-voting: user cannot vote for their own team
  if (context.userTeamId && context.userTeamId === request.teamId) {
    return { isValid: false, error: 'SELF_VOTE_NOT_ALLOWED' };
  }

  // Check if user is a member of the team they're trying to vote for
  if (team.memberIds.includes(context.userId)) {
    return { isValid: false, error: 'SELF_VOTE_NOT_ALLOWED' };
  }

  // Check if user has already cast a final vote
  if (request.isFinalVote) {
    const existingFinalVote = Array.from(storage.votes.values()).find(
      (v) => v.userId === context.userId && v.isFinalVote
    );
    if (existingFinalVote) {
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
  const validation = validateVote(request, context);
  if (!validation.isValid) {
    return {
      success: false,
      error: getValidationErrorMessage(validation.error!),
    };
  }

  // Check for existing non-final vote from this user for this team
  const existingVoteEntry = Array.from(storage.votes.entries()).find(
    ([_, v]) => v.userId === context.userId && v.teamId === request.teamId && !v.isFinalVote
  );

  const voteId = existingVoteEntry ? existingVoteEntry[0] : generateId();
  const isNew = !existingVoteEntry;

  const vote: Vote = {
    id: voteId,
    userId: context.userId,
    teamId: request.teamId,
    isFinalVote: request.isFinalVote,
    publicNote: request.publicNote ?? null,
    submittedAt: new Date(),
  };

  storage.votes.set(voteId, vote);

  return {
    success: true,
    data: { vote, isNew },
  };
}

export async function getUserRankings(
  userId: UserId
): Promise<ApiResponse<RankingsResponse>> {
  const userNotes: UserRanking[] = [];
  let finalVoteTeamId: TeamId | null = null;

  // Get user's final vote
  const finalVote = Array.from(storage.votes.values()).find(
    (v) => v.userId === userId && v.isFinalVote
  );
  if (finalVote) {
    finalVoteTeamId = finalVote.teamId;
  }

  // Get all teams and user's notes/votes
  for (const team of storage.teams.values()) {
    if (!team.hasPresented) continue;

    const noteKey = `${userId}:${team.id}`;
    const privateNote = storage.privateNotes.get(noteKey);
    const hasVoted = Array.from(storage.votes.values()).some(
      (v) => v.userId === userId && v.teamId === team.id
    );

    userNotes.push({
      teamId: team.id,
      teamName: team.name,
      ranking: privateNote?.ranking ?? 0,
      note: privateNote?.note ?? '',
      hasVoted,
    });
  }

  // Sort by ranking (higher first, then alphabetically by name)
  userNotes.sort((a, b) => {
    if (a.ranking !== b.ranking) return b.ranking - a.ranking;
    return a.teamName.localeCompare(b.teamName);
  });

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
  const team = storage.teams.get(request.teamId);
  if (!team) {
    return {
      success: false,
      error: 'Team not found',
    };
  }

  const noteKey = `${userId}:${request.teamId}`;
  const existingNote = storage.privateNotes.get(noteKey);

  const privateNote: PrivateNote = {
    id: existingNote?.id ?? generateId(),
    userId,
    teamId: request.teamId,
    note: request.note,
    ranking: request.ranking,
    updatedAt: new Date(),
  };

  storage.privateNotes.set(noteKey, privateNote);

  return {
    success: true,
    data: privateNote,
  };
}

export async function getVoteCount(teamId: TeamId): Promise<number> {
  return Array.from(storage.votes.values()).filter(
    (v) => v.teamId === teamId && v.isFinalVote
  ).length;
}

export async function setVotingOpen(isOpen: boolean): Promise<void> {
  storage.votingOpen = isOpen;
}

export async function isVotingOpen(): Promise<boolean> {
  return storage.votingOpen;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

export async function registerTeam(
  id: TeamId,
  name: string,
  memberIds: UserId[]
): Promise<void> {
  storage.teams.set(id, {
    id,
    name,
    hasPresented: false,
    memberIds,
  });
}

export async function markTeamAsPresented(teamId: TeamId): Promise<boolean> {
  const team = storage.teams.get(teamId);
  if (!team) return false;
  team.hasPresented = true;
  return true;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

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
