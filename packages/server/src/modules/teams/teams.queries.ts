/**
 * Teams Database Queries
 *
 * SQL queries for team management operations.
 * All queries use parameterized statements for security.
 *
 * OWNERSHIP: AGENT_TEAMS
 */

import { query, transaction } from '../../core/db/client';
import type { TeamRow, UserRow } from '../../core/db/types';

// ============================================================================
// TEAM QUERIES
// ============================================================================

/**
 * Get all teams, ordered by presentation order
 */
export async function getAllTeams(): Promise<TeamRow[]> {
  const result = await query<TeamRow>(
    `SELECT id, name, presentation_order, has_presented, created_at, updated_at
     FROM teams
     ORDER BY 
       CASE WHEN presentation_order IS NULL THEN 1 ELSE 0 END,
       presentation_order ASC,
       created_at ASC`
  );
  return result.rows;
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string): Promise<TeamRow | null> {
  const result = await query<TeamRow>(
    `SELECT id, name, presentation_order, has_presented, created_at, updated_at
     FROM teams
     WHERE id = $1`,
    [teamId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new team
 */
export interface CreateTeamInput {
  name: string;
  presentationOrder?: number | null;
}

export async function createTeam(input: CreateTeamInput): Promise<TeamRow> {
  const result = await query<TeamRow>(
    `INSERT INTO teams (name, presentation_order)
     VALUES ($1, $2)
     RETURNING id, name, presentation_order, has_presented, created_at, updated_at`,
    [input.name, input.presentationOrder || null]
  );
  if (!result.rows[0]) {
    throw new Error('Failed to create team');
  }
  return result.rows[0];
}

/**
 * Update a team
 */
export interface UpdateTeamInput {
  name?: string;
  presentationOrder?: number | null;
  hasPresented?: boolean;
}

export async function updateTeam(
  teamId: string,
  updates: UpdateTeamInput
): Promise<TeamRow> {
  const updatesList: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updatesList.push(`name = $${paramIndex}`);
    params.push(updates.name);
    paramIndex++;
  }

  if (updates.presentationOrder !== undefined) {
    updatesList.push(`presentation_order = $${paramIndex}`);
    params.push(updates.presentationOrder);
    paramIndex++;
  }

  if (updates.hasPresented !== undefined) {
    updatesList.push(`has_presented = $${paramIndex}`);
    params.push(updates.hasPresented);
    paramIndex++;
  }

  if (updatesList.length === 0) {
    // No updates, just return the team
    const team = await getTeamById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    return team;
  }

  updatesList.push(`updated_at = NOW()`);
  params.push(teamId);

  const result = await query<TeamRow>(
    `UPDATE teams
     SET ${updatesList.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, name, presentation_order, has_presented, created_at, updated_at`,
    params
  );

  if (result.rows.length === 0 || !result.rows[0]) {
    throw new Error('Team not found');
  }

  return result.rows[0];
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  await query('DELETE FROM teams WHERE id = $1', [teamId]);
}

/**
 * Get all members of a team
 */
export async function getTeamMembers(teamId: string): Promise<UserRow[]> {
  const result = await query<UserRow>(
    `SELECT id, email, password, name, role, team_id, created_at, updated_at
     FROM users
     WHERE team_id = $1
     ORDER BY name ASC`,
    [teamId]
  );
  return result.rows;
}

/**
 * Get team member count
 */
export async function getTeamMemberCount(teamId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM users
     WHERE team_id = $1`,
    [teamId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Assign a user to a team
 * Uses transaction to ensure atomicity
 */
export async function assignUserToTeam(
  userId: string,
  teamId: string
): Promise<void> {
  await transaction(async (client) => {
    // Check if user is already in another team
    const existingTeam = await client.query<{ team_id: string | null }>(
      `SELECT team_id FROM users WHERE id = $1`,
      [userId]
    );

    if (existingTeam.rows[0]?.team_id && existingTeam.rows[0].team_id !== teamId) {
      throw new Error(`User is already assigned to another team`);
    }

    // Update user's team assignment
    await client.query(
      `UPDATE users
       SET team_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [teamId, userId]
    );
  });
}

/**
 * Remove a user from a team
 */
export async function removeUserFromTeam(userId: string): Promise<void> {
  await query(
    `UPDATE users
     SET team_id = NULL, updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Check if a user is already assigned to a team
 */
export async function isUserInTeam(userId: string, teamId: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM users WHERE id = $1 AND team_id = $2
     ) as exists`,
    [userId, teamId]
  );
  return result.rows[0]?.exists || false;
}

/**
 * Check if a user is in any team
 */
export async function getUserTeamId(userId: string): Promise<string | null> {
  const result = await query<{ team_id: string | null }>(
    `SELECT team_id FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.team_id || null;
}
