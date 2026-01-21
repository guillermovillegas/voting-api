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
