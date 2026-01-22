/**
 * Socket Broadcaster
 *
 * Simple utility to broadcast events from anywhere in the app.
 * Used by API routes to send real-time updates to connected clients.
 */

import type { Server } from 'socket.io';

// Store reference to io instance
let ioInstance: Server | null = null;

/**
 * Initialize the broadcaster with the Socket.io server instance
 */
export function initBroadcaster(io: Server): void {
  ioInstance = io;
  console.log('[Broadcaster] Initialized');
}

/**
 * Get the Socket.io server instance
 */
export function getIO(): Server | null {
  return ioInstance;
}

// ============================================================================
// BROADCAST FUNCTIONS - Call these from API routes
// ============================================================================

/**
 * Broadcast leaderboard update to all clients
 */
export function broadcastLeaderboard(leaderboard: unknown): void {
  if (ioInstance) {
    ioInstance.emit('leaderboard:update', leaderboard);
    console.log('[Broadcast] leaderboard:update');
  }
}

/**
 * Broadcast when a vote is submitted
 */
export function broadcastVoteSubmitted(vote: unknown): void {
  if (ioInstance) {
    ioInstance.emit('vote:submitted', vote);
    console.log('[Broadcast] vote:submitted');
  }
}

/**
 * Broadcast presentation status change
 */
export function broadcastPresentationUpdate(presentation: unknown): void {
  if (ioInstance) {
    ioInstance.emit('presentation:update', presentation);
    console.log('[Broadcast] presentation:update');
  }
}

/**
 * Broadcast timer state change
 */
export function broadcastTimerUpdate(timerState: unknown): void {
  if (ioInstance) {
    ioInstance.emit('timer:update', timerState);
    console.log('[Broadcast] timer:update');
  }
}

/**
 * Broadcast timer expired
 */
export function broadcastTimerExpired(): void {
  if (ioInstance) {
    ioInstance.emit('timer:expired', { timestamp: new Date().toISOString() });
    console.log('[Broadcast] timer:expired');
  }
}

/**
 * Broadcast team update (created, updated, deleted)
 */
export function broadcastTeamUpdate(action: 'created' | 'updated' | 'deleted', team: unknown): void {
  if (ioInstance) {
    ioInstance.emit('team:update', { action, team });
    console.log(`[Broadcast] team:update (${action})`);
  }
}

/**
 * Generic broadcast for custom events
 */
export function broadcast(event: string, data: unknown): void {
  if (ioInstance) {
    ioInstance.emit(event, data);
    console.log(`[Broadcast] ${event}`);
  }
}

export const broadcaster = {
  init: initBroadcaster,
  getIO,
  leaderboard: broadcastLeaderboard,
  vote: broadcastVoteSubmitted,
  presentation: broadcastPresentationUpdate,
  timer: broadcastTimerUpdate,
  timerExpired: broadcastTimerExpired,
  team: broadcastTeamUpdate,
  emit: broadcast,
};
