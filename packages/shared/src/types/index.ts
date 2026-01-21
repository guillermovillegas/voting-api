/**
 * Shared Type Definitions
 *
 * OWNERSHIP: SHARED-APPEND
 * - Add new types at the end of this file
 * - NEVER modify existing types without coordination
 * - Each agent should prefix their types with their module name
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export type UserId = string;
export type TeamId = string;
export type VoteId = string;
export type PresentationId = string;

export type UserRole = 'admin' | 'voter';
export type PresentationStatus = 'upcoming' | 'current' | 'completed';

// ============================================================================
// USER TYPES (AGENT_AUTH)
// ============================================================================

export interface User {
  id: UserId;
  email: string;
  name: string;
  role: UserRole;
  teamId: TeamId | null;
  createdAt: Date;
}

export interface AuthUser extends User {
  // Extended user info for authenticated sessions
}

// ============================================================================
// TEAM TYPES (AGENT_TEAMS)
// ============================================================================

export interface Team {
  id: TeamId;
  name: string;
  presentationOrder: number | null;
  hasPresented: boolean;
  createdAt: Date;
}

export interface TeamWithMembers extends Team {
  members: User[];
}

// ============================================================================
// VOTE TYPES (AGENT_VOTING)
// ============================================================================

export interface Vote {
  id: VoteId;
  userId: UserId;
  teamId: TeamId;
  isFinalVote: boolean;
  publicNote: string | null;
  submittedAt: Date;
}

export interface PrivateNote {
  id: string;
  userId: UserId;
  teamId: TeamId;
  note: string;
  ranking: number;
  updatedAt: Date;
}

// ============================================================================
// PRESENTATION TYPES (AGENT_PRESENT)
// ============================================================================

export interface Presentation {
  id: PresentationId;
  teamId: TeamId;
  status: PresentationStatus;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface TimerState {
  isActive: boolean;
  durationSeconds: number;
  startedAt: Date | null;
  pausedAt: Date | null;
  elapsedSeconds: number;
  currentPresentationId: PresentationId | null;
}

// ============================================================================
// LEADERBOARD TYPES (AGENT_LEADER)
// ============================================================================

export interface LeaderboardEntry {
  teamId: TeamId;
  teamName: string;
  voteCount: number;
  rank: number;
  hasPresented: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// SOCKET EVENT TYPES
// ============================================================================

export interface SocketEvents {
  // Server -> Client
  'leaderboard:update': (entries: LeaderboardEntry[]) => void;
  'presentation:update': (presentation: Presentation) => void;
  'timer:update': (timer: TimerState) => void;
  'vote:count': (teamId: TeamId, count: number) => void;

  // Client -> Server
  'vote:submit': (vote: Omit<Vote, 'id' | 'submittedAt'>) => void;
  'timer:start': () => void;
  'timer:pause': () => void;
  'timer:reset': () => void;
}

// ============================================================================
// ADD NEW TYPES BELOW THIS LINE
// Format: // Added by AGENT_<ID> - <date>
// ============================================================================

// Added by AGENT_VOTING - 2026-01-20
// ============================================================================
// VOTING API TYPES
// ============================================================================

/**
 * Request to submit a vote for a team
 */
export interface VotingSubmitRequest {
  teamId: TeamId;
  isFinalVote: boolean;
  publicNote?: string | null;
}

/**
 * Response after submitting a vote
 */
export interface VotingSubmitResponse {
  vote: Vote;
  isNew: boolean;
}

/**
 * User's ranking entry for a team
 */
export interface VotingUserRanking {
  teamId: TeamId;
  teamName: string;
  ranking: number;
  note: string;
  hasVoted: boolean;
}

/**
 * Response containing user's rankings
 */
export interface VotingRankingsResponse {
  rankings: VotingUserRanking[];
  finalVoteTeamId: TeamId | null;
}

/**
 * Request to update a private note
 */
export interface VotingUpdateNoteRequest {
  teamId: TeamId;
  note: string;
  ranking: number;
}

/**
 * Voting status response
 */
export interface VotingStatusResponse {
  isOpen: boolean;
}

/**
 * Vote count for a team
 */
export interface VotingTeamCount {
  teamId: TeamId;
  count: number;
}

/**
 * Validation errors for voting
 */
export type VotingValidationError =
  | 'SELF_VOTE_NOT_ALLOWED'
  | 'TEAM_NOT_FOUND'
  | 'TEAM_NOT_PRESENTED'
  | 'USER_NOT_FOUND'
  | 'ALREADY_VOTED_FINAL'
  | 'VOTING_CLOSED';

// Added by AGENT_LEADER - 2026-01-20
// ============================================================================
// LEADERBOARD EXTENDED TYPES
// ============================================================================

/**
 * Socket events specific to leaderboard real-time updates
 */
export interface LeaderboardSocketEvents {
  // Server -> Client
  'leaderboard:update': (entries: LeaderboardEntry[]) => void;
  'leaderboard:team:update': (data: { teamId: TeamId; entry: LeaderboardEntry | null }) => void;
  'leaderboard:error': (data: { message: string }) => void;

  // Client -> Server
  'leaderboard:subscribe': () => void;
  'leaderboard:unsubscribe': () => void;
  'leaderboard:request': () => void;
  'leaderboard:vote': (data: { teamId: TeamId }) => void;
  'leaderboard:retract': (data: { teamId: TeamId }) => void;
}

/**
 * Statistics for the leaderboard
 */
export interface LeaderboardStats {
  totalTeams: number;
  totalVotes: number;
  teamsPresented: number;
  topTeam: LeaderboardEntry | null;
}

/**
 * Request to register a team for the leaderboard
 */
export interface LeaderboardRegisterTeamRequest {
  teamId: TeamId;
  teamName: string;
  voteCount?: number;
  hasPresented?: boolean;
}

// Added by AGENT_AUTH - 2026-01-20
// ============================================================================
// AUTH API TYPES
// ============================================================================

/**
 * Login request payload
 */
export interface AuthLoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload
 */
export interface AuthRegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * JWT token payload structure
 */
export interface AuthJWTPayload {
  userId: UserId;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Authentication tokens response
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login/Register response
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Token refresh request
 */
export interface AuthRefreshRequest {
  refreshToken: string;
}

/**
 * Password change request
 */
export interface AuthPasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Auth session status
 */
export type AuthSessionStatus = 'authenticated' | 'unauthenticated' | 'loading';

/**
 * Auth context state for client-side
 */
export interface AuthState {
  user: User | null;
  status: AuthSessionStatus;
  accessToken: string | null;
}
