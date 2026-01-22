/**
 * Timer Socket Handlers
 *
 * WebSocket event handlers for timer state updates.
 *
 * OWNERSHIP: AGENT_PRESENT
 */

import type { Server, Socket } from 'socket.io';
import * as timerService from './timer.service';
import type { TimerState } from '@voting/shared';

// ============================================================================
// SOCKET EVENT HANDLERS
// ============================================================================

/**
 * Register timer socket event handlers
 */
export function registerTimerSocketHandlers(io: Server, socket: Socket): void {
  /**
   * Client subscribes to timer updates
   */
  socket.on('timer:subscribe', async () => {
    try {
      const result = await timerService.getTimerState();
      if (result.success && result.data) {
        socket.emit('timer:update', result.data);
      }
    } catch (error) {
      socket.emit('timer:error', {
        message: error instanceof Error ? error.message : 'Failed to get timer state',
      });
    }
  });

  /**
   * Client requests current timer state
   */
  socket.on('timer:request', async () => {
    try {
      const result = await timerService.getTimerState();
      if (result.success && result.data) {
        socket.emit('timer:update', result.data);
      }
    } catch (error) {
      socket.emit('timer:error', {
        message: error instanceof Error ? error.message : 'Failed to get timer state',
      });
    }
  });
}

/**
 * Broadcast timer update to all connected clients
 */
export function broadcastTimerUpdate(io: Server, timerState: TimerState): void {
  io.emit('timer:update', timerState);
}

/**
 * Broadcast timer started event
 */
export function broadcastTimerStarted(io: Server, timerState: TimerState): void {
  io.emit('timer:started', timerState);
}

/**
 * Broadcast timer paused event
 */
export function broadcastTimerPaused(io: Server, timerState: TimerState): void {
  io.emit('timer:paused', timerState);
}

/**
 * Broadcast timer expired event
 */
export function broadcastTimerExpired(io: Server): void {
  io.emit('timer:expired');
}

/**
 * Broadcast timer reset event
 */
export function broadcastTimerReset(io: Server, timerState: TimerState): void {
  io.emit('timer:reset', timerState);
}
