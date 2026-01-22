/**
 * Timer Service
 *
 * Business logic for timer state management.
 *
 * OWNERSHIP: AGENT_PRESENT
 */

import type { TimerState, ApiResponse } from '@voting/shared';
import * as timerQueries from './timer.queries';
import type { TimerStateRow } from '../../core/db/types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function rowToTimerState(row: TimerStateRow): TimerState {
  return {
    isActive: row.is_active,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    elapsedSeconds: row.elapsed_seconds,
    currentPresentationId: row.presentation_id,
  };
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get current timer state
 */
export async function getTimerState(): Promise<ApiResponse<TimerState | null>> {
  try {
    const row = await timerQueries.getTimerState();
    return { success: true, data: row ? rowToTimerState(row) : null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch timer state',
    };
  }
}

/**
 * Start timer for a presentation
 */
export async function startTimer(presentationId: string): Promise<ApiResponse<TimerState>> {
  try {
    const row = await timerQueries.startTimer(presentationId);
    return { success: true, data: rowToTimerState(row) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start timer',
    };
  }
}

/**
 * Pause timer
 */
export async function pauseTimer(): Promise<ApiResponse<TimerState>> {
  try {
    const row = await timerQueries.pauseTimer();
    return { success: true, data: rowToTimerState(row) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pause timer',
    };
  }
}

/**
 * Reset timer
 */
export async function resetTimer(): Promise<ApiResponse<TimerState>> {
  try {
    const row = await timerQueries.resetTimer();
    return { success: true, data: rowToTimerState(row) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset timer',
    };
  }
}

/**
 * Update timer duration
 */
export async function updateTimerDuration(seconds: number): Promise<ApiResponse<TimerState>> {
  try {
    if (seconds < 1 || seconds > 3600) {
      return { success: false, error: 'Duration must be between 1 and 3600 seconds' };
    }

    const row = await timerQueries.updateTimerDuration(seconds);
    return { success: true, data: rowToTimerState(row) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update timer duration',
    };
  }
}

/**
 * Calculate remaining time
 */
export async function getRemainingTime(): Promise<ApiResponse<number>> {
  try {
    const row = await timerQueries.getTimerState();
    if (!row || !row.is_active) {
      return { success: true, data: 0 };
    }

    const now = new Date();
    const startedAt = row.started_at ? new Date(row.started_at) : now;
    const elapsed = row.elapsed_seconds + Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    const remaining = Math.max(0, row.duration_seconds - elapsed);

    return { success: true, data: remaining };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate remaining time',
    };
  }
}

// Export service object for consistency
export const timerService = {
  getTimerState,
  startTimer,
  pauseTimer,
  resetTimer,
  updateTimerDuration,
  getRemainingTime,
};
