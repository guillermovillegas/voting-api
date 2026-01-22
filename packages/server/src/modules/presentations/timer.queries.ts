/**
 * Timer Database Queries
 *
 * SQL queries for timer state management.
 * All queries use parameterized statements for security.
 *
 * OWNERSHIP: AGENT_PRESENT
 */

import { query } from '../../core/db/client';
import type { TimerStateRow } from '../../core/db/types';

// ============================================================================
// TIMER QUERIES
// ============================================================================

/**
 * Get current timer state
 */
export async function getTimerState(): Promise<TimerStateRow | null> {
  const result = await query<TimerStateRow>(
    `SELECT id, is_active, duration_seconds, started_at, paused_at, elapsed_seconds, presentation_id
     FROM timer_state
     WHERE id = 'global'`
  );
  return result.rows[0] || null;
}

/**
 * Update timer state
 */
export interface TimerStateInput {
  isActive?: boolean;
  durationSeconds?: number;
  startedAt?: Date | null;
  pausedAt?: Date | null;
  elapsedSeconds?: number;
  presentationId?: string | null;
}

export async function updateTimerState(input: TimerStateInput): Promise<TimerStateRow> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(input.isActive);
    paramIndex++;
  }

  if (input.durationSeconds !== undefined) {
    updates.push(`duration_seconds = $${paramIndex}`);
    params.push(input.durationSeconds);
    paramIndex++;
  }

  if (input.startedAt !== undefined) {
    updates.push(`started_at = $${paramIndex}`);
    params.push(input.startedAt);
    paramIndex++;
  }

  if (input.pausedAt !== undefined) {
    updates.push(`paused_at = $${paramIndex}`);
    params.push(input.pausedAt);
    paramIndex++;
  }

  if (input.elapsedSeconds !== undefined) {
    updates.push(`elapsed_seconds = $${paramIndex}`);
    params.push(input.elapsedSeconds);
    paramIndex++;
  }

  if (input.presentationId !== undefined) {
    updates.push(`presentation_id = $${paramIndex}`);
    params.push(input.presentationId);
    paramIndex++;
  }

  if (updates.length === 0) {
    // No updates, just return current state
    const current = await getTimerState();
    if (!current) {
      throw new Error('Timer state not found');
    }
    return current;
  }

  params.push('global');

  const result = await query<TimerStateRow>(
    `UPDATE timer_state
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, is_active, duration_seconds, started_at, paused_at, elapsed_seconds, presentation_id`,
    params
  );

  if (!result.rows[0]) {
    throw new Error('Timer state not found');
  }

  return result.rows[0];
}

/**
 * Start timer for a presentation
 */
export async function startTimer(presentationId: string): Promise<TimerStateRow> {
  const now = new Date();
  return await updateTimerState({
    isActive: true,
    startedAt: now,
    pausedAt: null,
    elapsedSeconds: 0,
    presentationId,
  });
}

/**
 * Pause timer
 */
export async function pauseTimer(): Promise<TimerStateRow> {
  const current = await getTimerState();
  if (!current) {
    throw new Error('Timer state not found');
  }

  if (!current.is_active) {
    return current; // Already paused
  }

  const now = new Date();
  const startedAt = current.started_at ? new Date(current.started_at) : now;
  const elapsed = current.elapsed_seconds + Math.floor((now.getTime() - startedAt.getTime()) / 1000);

  return await updateTimerState({
    isActive: false,
    pausedAt: now,
    elapsedSeconds: elapsed,
  });
}

/**
 * Reset timer
 */
export async function resetTimer(): Promise<TimerStateRow> {
  return await updateTimerState({
    isActive: false,
    startedAt: null,
    pausedAt: null,
    elapsedSeconds: 0,
    presentationId: null,
  });
}

/**
 * Update elapsed seconds
 */
export async function updateElapsedSeconds(seconds: number): Promise<TimerStateRow> {
  return await updateTimerState({
    elapsedSeconds: seconds,
  });
}

/**
 * Update timer duration
 */
export async function updateTimerDuration(seconds: number): Promise<TimerStateRow> {
  return await updateTimerState({
    durationSeconds: seconds,
  });
}
