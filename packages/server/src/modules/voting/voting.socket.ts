/**
 * Voting Socket Handlers
 *
 * WebSocket event handlers for voting updates.
 *
 * OWNERSHIP: AGENT_VOTING
 */

import type { Server } from 'socket.io';
import type { Vote, LeaderboardEntry } from '@priv/types';

// ============================================================================
// SOCKET EVENT BROADCASTERS
// ============================================================================

/**
 * Broadcast vote submitted event
 */
export function broadcastVoteSubmitted(io: Server, vote: Vote): void {
  io.emit('vote:submitted', vote);
}

/**
 * Broadcast vote count update for a team
 */
export function broadcastVoteCountUpdate(io: Server, teamId: string, count: number): void {
  io.emit('vote:count:update', { teamId, count });
}

/**
 * Broadcast leaderboard update
 */
export function broadcastLeaderboardUpdate(io: Server, leaderboard: LeaderboardEntry[]): void {
  io.emit('leaderboard:update', leaderboard);
}
