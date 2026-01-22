/**
 * Presentations Socket Handlers
 *
 * WebSocket event handlers for presentation queue updates.
 *
 * OWNERSHIP: AGENT_PRESENT
 */

import type { Server, Socket } from 'socket.io';
import * as presentationsService from './presentations.service';
import type { Presentation } from '@priv/types';

// ============================================================================
// SOCKET EVENT HANDLERS
// ============================================================================

/**
 * Register presentation socket event handlers
 */
export function registerPresentationSocketHandlers(io: Server, socket: Socket): void {
  /**
   * Client subscribes to presentation updates
   */
  socket.on('presentation:subscribe', async () => {
    try {
      const status = await presentationsService.getQueueStatus();
      if (status.success) {
        socket.emit('presentation:queue:updated', status.data);
      }
    } catch (error) {
      socket.emit('presentation:error', {
        message: error instanceof Error ? error.message : 'Failed to get queue status',
      });
    }
  });

  /**
   * Client requests current queue status
   */
  socket.on('presentation:request', async () => {
    try {
      const status = await presentationsService.getQueueStatus();
      if (status.success) {
        socket.emit('presentation:queue:updated', status.data);
      }
    } catch (error) {
      socket.emit('presentation:error', {
        message: error instanceof Error ? error.message : 'Failed to get queue status',
      });
    }
  });
}

/**
 * Broadcast presentation update to all connected clients
 */
export function broadcastPresentationUpdate(io: Server, presentation: Presentation): void {
  io.emit('presentation:update', presentation);
}

/**
 * Broadcast presentation started event
 */
export function broadcastPresentationStarted(io: Server, presentation: Presentation): void {
  io.emit('presentation:started', presentation);
}

/**
 * Broadcast presentation completed event
 */
export function broadcastPresentationCompleted(io: Server, presentation: Presentation): void {
  io.emit('presentation:completed', presentation);
}

/**
 * Broadcast queue updated event
 */
export async function broadcastQueueUpdated(io: Server): Promise<void> {
  try {
    const status = await presentationsService.getQueueStatus();
    if (status.success) {
      io.emit('presentation:queue:updated', status.data);
    }
  } catch (error) {
    console.error('Failed to broadcast queue update:', error);
  }
}
