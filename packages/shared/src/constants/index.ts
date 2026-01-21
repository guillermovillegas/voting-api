/**
 * Shared Constants
 *
 * OWNERSHIP: SHARED-APPEND
 * Add new constants at the end. Do not modify existing values.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export const APP_CONFIG = {
  name: 'Hackathon Voting',
  version: '0.1.0',
  minTeamSize: 3,
  maxTeamSize: 6,
  defaultTimerDuration: 300, // 5 minutes in seconds
} as const;

// ============================================================================
// API ROUTES
// ============================================================================

export const API_ROUTES = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',

  // Teams
  TEAMS: '/api/teams',
  TEAM_BY_ID: '/api/teams/:id',
  TEAM_MEMBERS: '/api/teams/:id/members',

  // Voting
  VOTES: '/api/votes',
  VOTE_SUBMIT: '/api/votes/submit',
  MY_RANKINGS: '/api/votes/rankings',

  // Presentations
  PRESENTATIONS: '/api/presentations',
  PRESENTATION_CURRENT: '/api/presentations/current',
  PRESENTATION_NEXT: '/api/presentations/next',

  // Leaderboard
  LEADERBOARD: '/api/leaderboard',

  // Admin
  ADMIN_STATS: '/api/admin/stats',
  ADMIN_EXPORT: '/api/admin/export',
  ADMIN_RESET: '/api/admin/reset',
} as const;

// ============================================================================
// SOCKET EVENTS
// ============================================================================

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Leaderboard
  LEADERBOARD_UPDATE: 'leaderboard:update',

  // Presentations
  PRESENTATION_UPDATE: 'presentation:update',
  PRESENTATION_STARTED: 'presentation:started',
  PRESENTATION_ENDED: 'presentation:ended',

  // Timer
  TIMER_UPDATE: 'timer:update',
  TIMER_START: 'timer:start',
  TIMER_PAUSE: 'timer:pause',
  TIMER_RESET: 'timer:reset',
  TIMER_EXPIRED: 'timer:expired',

  // Voting
  VOTE_SUBMITTED: 'vote:submitted',
  VOTE_COUNT_UPDATE: 'vote:count',
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  TEAM_SIZE_INVALID: 'TEAM_SIZE_INVALID',

  // Business logic errors
  SELF_VOTE_NOT_ALLOWED: 'SELF_VOTE_NOT_ALLOWED',
  ALREADY_VOTED: 'ALREADY_VOTED',
  VOTING_CLOSED: 'VOTING_CLOSED',
  PRESENTATION_IN_PROGRESS: 'PRESENTATION_IN_PROGRESS',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================================================
// ADD NEW CONSTANTS BELOW THIS LINE
// Format: // Added by AGENT_<ID> - <date>
// ============================================================================
