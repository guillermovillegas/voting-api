/**
 * Authentication Database Queries
 *
 * SQL queries for user authentication and management.
 * All queries use parameterized statements for security.
 *
 * OWNERSHIP: AGENT_AUTH
 */

import { query } from '../../core/db/client';
import type { UserRow } from '../../core/db/types';

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Find a user by email address
 */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `SELECT id, email, password, name, role, team_id, created_at, updated_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `SELECT id, email, password, name, role, team_id, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new user
 */
export interface CreateUserInput {
  email: string;
  password: string; // Hashed password
  name: string;
  role?: 'admin' | 'voter';
  teamId?: string | null;
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const result = await query<UserRow>(
    `INSERT INTO users (email, password, name, role, team_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, password, name, role, team_id, created_at, updated_at`,
    [input.email, input.password, input.name, input.role || 'voter', input.teamId || null]
  );
  if (!result.rows[0]) {
    throw new Error('Failed to create user');
  }
  return result.rows[0];
}

/**
 * Update user password
 */
export async function updateUserPassword(id: string, hashedPassword: string): Promise<void> {
  await query(
    `UPDATE users
     SET password = $1, updated_at = NOW()
     WHERE id = $2`,
    [hashedPassword, id]
  );
}

/**
 * Update user's team assignment
 */
export async function updateUserTeam(userId: string, teamId: string | null): Promise<void> {
  await query(
    `UPDATE users
     SET team_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [teamId, userId]
  );
}

/**
 * Get user's team ID
 */
export async function getUserTeamId(userId: string): Promise<string | null> {
  const result = await query<{ team_id: string | null }>(
    `SELECT team_id FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.team_id || null;
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<UserRow[]> {
  const result = await query<UserRow>(
    `SELECT id, email, password, name, role, team_id, created_at, updated_at
     FROM users
     ORDER BY created_at ASC`
  );
  return result.rows;
}
