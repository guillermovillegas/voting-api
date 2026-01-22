/**
 * Presentations Database Queries
 *
 * SQL queries for presentation queue management.
 * All queries use parameterized statements for security.
 *
 * OWNERSHIP: AGENT_PRESENT
 */

import { query, transaction } from '../../core/db/client';
import type { PresentationRow } from '../../core/db/types';

// ============================================================================
// PRESENTATION QUERIES
// ============================================================================

/**
 * Get all presentations ordered by status and presentation order
 */
export async function getAllPresentations(): Promise<PresentationRow[]> {
  const result = await query<PresentationRow>(
    `SELECT p.id, p.team_id, p.status, p.started_at, p.completed_at, p.created_at
     FROM presentations p
     JOIN teams t ON t.id = p.team_id
     ORDER BY
       CASE p.status
         WHEN 'current' THEN 1
         WHEN 'upcoming' THEN 2
         WHEN 'completed' THEN 3
       END,
       t.presentation_order ASC,
       p.created_at ASC`
  );
  return result.rows;
}

/**
 * Get presentation by ID
 */
export async function getPresentationById(id: string): Promise<PresentationRow | null> {
  const result = await query<PresentationRow>(
    `SELECT id, team_id, status, started_at, completed_at, created_at
     FROM presentations
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get current presentation (status = 'current')
 */
export async function getCurrentPresentation(): Promise<PresentationRow | null> {
  const result = await query<PresentationRow>(
    `SELECT id, team_id, status, started_at, completed_at, created_at
     FROM presentations
     WHERE status = 'current'
     LIMIT 1`
  );
  return result.rows[0] || null;
}

/**
 * Get all upcoming presentations
 */
export async function getUpcomingPresentations(): Promise<PresentationRow[]> {
  const result = await query<PresentationRow>(
    `SELECT p.id, p.team_id, p.status, p.started_at, p.completed_at, p.created_at
     FROM presentations p
     JOIN teams t ON t.id = p.team_id
     WHERE p.status = 'upcoming'
     ORDER BY t.presentation_order ASC`
  );
  return result.rows;
}

/**
 * Get all completed presentations
 */
export async function getCompletedPresentations(): Promise<PresentationRow[]> {
  const result = await query<PresentationRow>(
    `SELECT p.id, p.team_id, p.status, p.started_at, p.completed_at, p.created_at
     FROM presentations p
     JOIN teams t ON t.id = p.team_id
     WHERE p.status = 'completed'
     ORDER BY p.completed_at DESC`
  );
  return result.rows;
}

/**
 * Create a new presentation for a team
 */
export async function createPresentation(teamId: string): Promise<PresentationRow> {
  const result = await query<PresentationRow>(
    `INSERT INTO presentations (team_id, status)
     VALUES ($1, 'upcoming')
     RETURNING id, team_id, status, started_at, completed_at, created_at`,
    [teamId]
  );
  if (!result.rows[0]) {
    throw new Error('Failed to create presentation');
  }
  return result.rows[0];
}

/**
 * Update presentation status
 */
export async function updatePresentationStatus(
  id: string,
  status: 'upcoming' | 'current' | 'completed'
): Promise<PresentationRow> {
  const result = await query<PresentationRow>(
    `UPDATE presentations
     SET status = $1
     WHERE id = $2
     RETURNING id, team_id, status, started_at, completed_at, created_at`,
    [status, id]
  );
  if (!result.rows[0]) {
    throw new Error('Presentation not found');
  }
  return result.rows[0];
}

/**
 * Start a presentation (set status to 'current' and started_at)
 */
export async function startPresentation(id: string): Promise<PresentationRow> {
  const result = await query<PresentationRow>(
    `UPDATE presentations
     SET status = 'current', started_at = NOW()
     WHERE id = $1
     RETURNING id, team_id, status, started_at, completed_at, created_at`,
    [id]
  );
  if (!result.rows[0]) {
    throw new Error('Presentation not found');
  }
  return result.rows[0];
}

/**
 * Complete a presentation (set status to 'completed' and completed_at)
 */
export async function completePresentation(id: string): Promise<PresentationRow> {
  const result = await query<PresentationRow>(
    `UPDATE presentations
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1
     RETURNING id, team_id, status, started_at, completed_at, created_at`,
    [id]
  );
  if (!result.rows[0]) {
    throw new Error('Presentation not found');
  }
  return result.rows[0];
}

/**
 * Reset all presentations to 'upcoming' status
 */
export async function resetAllPresentations(): Promise<void> {
  await query(
    `UPDATE presentations
     SET status = 'upcoming', started_at = NULL, completed_at = NULL`
  );
}

/**
 * Delete all presentations (for queue reset)
 */
export async function deleteAllPresentations(): Promise<void> {
  await query('DELETE FROM presentations');
}

/**
 * Randomize team presentation order
 * Updates presentation_order for all teams with a random order
 */
export async function randomizePresentationOrder(): Promise<void> {
  await transaction(async (client) => {
    // Get all teams
    const teamsResult = await client.query<{ id: string }>('SELECT id FROM teams');
    const teamIds = teamsResult.rows.map((row) => row.id);

    // Shuffle array
    const shuffled = [...teamIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }

    // Update presentation_order for each team
    for (let i = 0; i < shuffled.length; i++) {
      await client.query(
        `UPDATE teams SET presentation_order = $1 WHERE id = $2`,
        [i + 1, shuffled[i]]
      );
    }
  });
}

/**
 * Initialize presentation queue
 * Creates presentations for all teams and randomizes order
 */
export async function initializePresentationQueue(): Promise<PresentationRow[]> {
  return await transaction(async (client) => {
    // Get all teams
    const teamsResult = await client.query<{ id: string }>('SELECT id FROM teams');
    const teamIds = teamsResult.rows.map((row) => row.id);

    // Delete existing presentations
    await client.query('DELETE FROM presentations');

    // Randomize presentation order
    const shuffled = [...teamIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }

    // Update teams with presentation order
    for (let i = 0; i < shuffled.length; i++) {
      await client.query(
        `UPDATE teams SET presentation_order = $1 WHERE id = $2`,
        [i + 1, shuffled[i]]
      );
    }

    // Create presentations for all teams
    const presentations: PresentationRow[] = [];
    for (const teamId of shuffled) {
      const result = await client.query<PresentationRow>(
        `INSERT INTO presentations (team_id, status)
         VALUES ($1, 'upcoming')
         RETURNING id, team_id, status, started_at, completed_at, created_at`,
        [teamId]
      );
      if (result.rows[0]) {
        presentations.push(result.rows[0]);
      }
    }

    return presentations;
  });
}

/**
 * Get next presentation in queue
 * Returns the first 'upcoming' presentation ordered by presentation_order
 */
export async function getNextPresentation(): Promise<PresentationRow | null> {
  const result = await query<PresentationRow>(
    `SELECT p.id, p.team_id, p.status, p.started_at, p.completed_at, p.created_at
     FROM presentations p
     JOIN teams t ON t.id = p.team_id
     WHERE p.status = 'upcoming'
     ORDER BY t.presentation_order ASC
     LIMIT 1`
  );
  return result.rows[0] || null;
}

/**
 * Advance to next presentation
 * Completes current presentation and starts the next one
 */
export async function advanceToNextPresentation(): Promise<{
  completed: PresentationRow | null;
  started: PresentationRow | null;
}> {
  return await transaction(async (client) => {
    // Complete current presentation
    const currentResult = await client.query<PresentationRow>(
      `UPDATE presentations
       SET status = 'completed', completed_at = NOW()
       WHERE status = 'current'
       RETURNING id, team_id, status, started_at, completed_at, created_at`
    );
    const completed = currentResult.rows[0] || null;

    // Start next presentation
    const nextResult = await client.query<PresentationRow>(
      `UPDATE presentations
       SET status = 'current', started_at = NOW()
       WHERE id = (
         SELECT p.id
         FROM presentations p
         JOIN teams t ON t.id = p.team_id
         WHERE p.status = 'upcoming'
         ORDER BY t.presentation_order ASC
         LIMIT 1
       )
       RETURNING id, team_id, status, started_at, completed_at, created_at`
    );
    const started = nextResult.rows[0] || null;

    return { completed, started };
  });
}
