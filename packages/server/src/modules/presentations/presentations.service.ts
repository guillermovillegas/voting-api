/**
 * Presentations Service
 *
 * Business logic for presentation queue management.
 *
 * OWNERSHIP: AGENT_PRESENT
 */

import type { Presentation, ApiResponse } from '@priv/types';
import * as presentationsQueries from './presentations.queries';
import * as teamsQueries from '../teams/teams.queries';
import type { PresentationRow } from '../../core/db/types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function rowToPresentation(row: PresentationRow): Presentation {
  return {
    id: row.id,
    teamId: row.team_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get all presentations
 */
export async function getAllPresentations(): Promise<ApiResponse<Presentation[]>> {
  try {
    const rows = await presentationsQueries.getAllPresentations();
    const presentations = rows.map(rowToPresentation);
    return { success: true, data: presentations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch presentations',
    };
  }
}

/**
 * Get current presentation
 */
export async function getCurrentPresentation(): Promise<ApiResponse<Presentation | null>> {
  try {
    const row = await presentationsQueries.getCurrentPresentation();
    return { success: true, data: row ? rowToPresentation(row) : null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch current presentation',
    };
  }
}

/**
 * Get upcoming presentations
 */
export async function getUpcomingPresentations(): Promise<ApiResponse<Presentation[]>> {
  try {
    const rows = await presentationsQueries.getUpcomingPresentations();
    const presentations = rows.map(rowToPresentation);
    return { success: true, data: presentations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch upcoming presentations',
    };
  }
}

/**
 * Get completed presentations
 */
export async function getCompletedPresentations(): Promise<ApiResponse<Presentation[]>> {
  try {
    const rows = await presentationsQueries.getCompletedPresentations();
    const presentations = rows.map(rowToPresentation);
    return { success: true, data: presentations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch completed presentations',
    };
  }
}

/**
 * Get presentation by ID
 */
export async function getPresentationById(id: string): Promise<ApiResponse<Presentation>> {
  try {
    const row = await presentationsQueries.getPresentationById(id);
    if (!row) {
      return { success: false, error: 'Presentation not found' };
    }
    return { success: true, data: rowToPresentation(row) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch presentation',
    };
  }
}

/**
 * Initialize presentation queue
 * Creates presentations for all teams and randomizes order
 */
export async function initializeQueue(): Promise<ApiResponse<Presentation[]>> {
  try {
    const rows = await presentationsQueries.initializePresentationQueue();
    const presentations = rows.map(rowToPresentation);
    return { success: true, data: presentations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize presentation queue',
    };
  }
}

/**
 * Start a presentation
 */
export async function startPresentation(id: string): Promise<ApiResponse<Presentation>> {
  try {
    // First, set any current presentation to completed
    const current = await presentationsQueries.getCurrentPresentation();
    if (current) {
      await presentationsQueries.completePresentation(current.id);
    }

    // Start the requested presentation
    const row = await presentationsQueries.startPresentation(id);
    return { success: true, data: rowToPresentation(row) };
  } catch (error) {
    if (error instanceof Error && error.message === 'Presentation not found') {
      return { success: false, error: 'Presentation not found' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start presentation',
    };
  }
}

/**
 * Advance to next presentation
 */
export async function advanceToNext(): Promise<ApiResponse<{ completed: Presentation | null; started: Presentation | null }>> {
  try {
    const result = await presentationsQueries.advanceToNextPresentation();
    return {
      success: true,
      data: {
        completed: result.completed ? rowToPresentation(result.completed) : null,
        started: result.started ? rowToPresentation(result.started) : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to advance to next presentation',
    };
  }
}

/**
 * Reset presentation queue
 */
export async function resetQueue(): Promise<ApiResponse<void>> {
  try {
    await presentationsQueries.deleteAllPresentations();
    // Optionally re-initialize
    // await presentationsQueries.initializePresentationQueue();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset presentation queue',
    };
  }
}

/**
 * Get queue status
 */
export interface QueueStatus {
  current: Presentation | null;
  upcoming: Presentation[];
  completed: Presentation[];
  total: number;
}

export async function getQueueStatus(): Promise<ApiResponse<QueueStatus>> {
  try {
    const [current, upcoming, completed] = await Promise.all([
      presentationsQueries.getCurrentPresentation(),
      presentationsQueries.getUpcomingPresentations(),
      presentationsQueries.getCompletedPresentations(),
    ]);

    return {
      success: true,
      data: {
        current: current ? rowToPresentation(current) : null,
        upcoming: upcoming.map(rowToPresentation),
        completed: completed.map(rowToPresentation),
        total: 1 + upcoming.length + completed.length, // current + upcoming + completed
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get queue status',
    };
  }
}

// Export service object for consistency
export const presentationsService = {
  getAllPresentations,
  getCurrentPresentation,
  getUpcomingPresentations,
  getCompletedPresentations,
  getPresentationById,
  initializeQueue,
  startPresentation,
  advanceToNext,
  resetQueue,
  getQueueStatus,
};
