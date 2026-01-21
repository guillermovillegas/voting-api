/**
 * Leaderboard Socket Handler
 *
 * OWNERSHIP: AGENT_LEADER
 * Real-time updates for leaderboard via Socket.IO
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { leaderboardService } from './leaderboard.service';
import type { LeaderboardEntry, TeamId } from '@priv/types';

// Event names for leaderboard socket communication
export const LEADERBOARD_EVENTS = {
  // Server -> Client
  UPDATE: 'leaderboard:update',
  TEAM_UPDATE: 'leaderboard:team:update',
  ERROR: 'leaderboard:error',

  // Client -> Server
  SUBSCRIBE: 'leaderboard:subscribe',
  UNSUBSCRIBE: 'leaderboard:unsubscribe',
  REQUEST_UPDATE: 'leaderboard:request',
  VOTE: 'leaderboard:vote',
  RETRACT_VOTE: 'leaderboard:retract',
} as const;

// Validation schemas
const VoteEventSchema = z.object({
  teamId: z.string().min(1),
});

const LeaderboardRoom = 'leaderboard';

/**
 * Broadcast leaderboard update to all subscribed clients
 */
function broadcastLeaderboardUpdate(io: Server, leaderboard: LeaderboardEntry[]): void {
  io.to(LeaderboardRoom).emit(LEADERBOARD_EVENTS.UPDATE, leaderboard);
}

/**
 * Broadcast single team update (for targeted updates)
 */
function broadcastTeamUpdate(io: Server, teamId: TeamId, entry: LeaderboardEntry | null): void {
  io.to(LeaderboardRoom).emit(LEADERBOARD_EVENTS.TEAM_UPDATE, { teamId, entry });
}

/**
 * Register leaderboard socket handlers for a connected client
 */
export function registerLeaderboardSocketHandlers(io: Server, socket: Socket): void {
  // Subscribe to leaderboard updates
  socket.on(LEADERBOARD_EVENTS.SUBSCRIBE, () => {
    socket.join(LeaderboardRoom);
    // Send current leaderboard state immediately
    const leaderboard = leaderboardService.getLeaderboard();
    socket.emit(LEADERBOARD_EVENTS.UPDATE, leaderboard);
    console.log(`[Leaderboard] Client ${socket.id} subscribed`);
  });

  // Unsubscribe from leaderboard updates
  socket.on(LEADERBOARD_EVENTS.UNSUBSCRIBE, () => {
    socket.leave(LeaderboardRoom);
    console.log(`[Leaderboard] Client ${socket.id} unsubscribed`);
  });

  // Request current leaderboard state
  socket.on(LEADERBOARD_EVENTS.REQUEST_UPDATE, () => {
    const leaderboard = leaderboardService.getLeaderboard();
    socket.emit(LEADERBOARD_EVENTS.UPDATE, leaderboard);
  });

  // Handle vote submission via socket
  socket.on(LEADERBOARD_EVENTS.VOTE, (data: unknown) => {
    try {
      const { teamId } = VoteEventSchema.parse(data);
      const leaderboard = leaderboardService.incrementVote(teamId);
      broadcastLeaderboardUpdate(io, leaderboard);
      console.log(`[Leaderboard] Vote recorded for team ${teamId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record vote';
      socket.emit(LEADERBOARD_EVENTS.ERROR, { message });
      console.error(`[Leaderboard] Vote error: ${message}`);
    }
  });

  // Handle vote retraction via socket
  socket.on(LEADERBOARD_EVENTS.RETRACT_VOTE, (data: unknown) => {
    try {
      const { teamId } = VoteEventSchema.parse(data);
      const leaderboard = leaderboardService.decrementVote(teamId);
      broadcastLeaderboardUpdate(io, leaderboard);
      console.log(`[Leaderboard] Vote retracted for team ${teamId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retract vote';
      socket.emit(LEADERBOARD_EVENTS.ERROR, { message });
      console.error(`[Leaderboard] Retract error: ${message}`);
    }
  });
}

/**
 * Notify all clients of a leaderboard change (call from service layer)
 */
export function notifyLeaderboardChange(io: Server): void {
  const leaderboard = leaderboardService.getLeaderboard();
  broadcastLeaderboardUpdate(io, leaderboard);
}

/**
 * Notify all clients of a specific team change
 */
export function notifyTeamChange(io: Server, teamId: TeamId): void {
  const entry = leaderboardService.getTeamEntry(teamId);
  broadcastTeamUpdate(io, teamId, entry);
}

export const leaderboardSocket = {
  registerLeaderboardSocketHandlers,
  notifyLeaderboardChange,
  notifyTeamChange,
  LEADERBOARD_EVENTS,
};
