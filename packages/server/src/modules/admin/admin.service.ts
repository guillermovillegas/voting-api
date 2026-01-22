/**
 * Admin Service
 *
 * Business logic for admin operations, statistics, and exports.
 *
 * OWNERSHIP: AGENT_ADMIN
 */

import type { ApiResponse } from '@voting/shared';
import * as adminQueries from './admin.queries';
import * as teamsQueries from '../teams/teams.queries';
import * as authQueries from '../auth/auth.queries';
import type { UserRow, TeamRow } from '../../core/db/types';
import type { User, Team } from '@voting/shared';
import { transaction } from '../../core/db/client';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    teamId: row.team_id,
    createdAt: row.created_at,
  };
}

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    presentationOrder: row.presentation_order,
    hasPresented: row.has_presented,
    createdAt: row.created_at,
  };
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get system statistics
 */
export async function getSystemStatistics(): Promise<ApiResponse<adminQueries.SystemStatistics>> {
  try {
    const stats = await adminQueries.getSystemStatistics();
    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch system statistics',
    };
  }
}

/**
 * Get all votes with details (transparency)
 */
export async function getAllVotes(): Promise<ApiResponse<adminQueries.VoteWithDetails[]>> {
  try {
    const votes = await adminQueries.getAllVotes();
    return { success: true, data: votes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch votes',
    };
  }
}

/**
 * Get vote statistics
 */
export async function getVoteStatistics(): Promise<ApiResponse<adminQueries.VoteStatistics>> {
  try {
    const stats = await adminQueries.getVoteStatistics();
    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vote statistics',
    };
  }
}

/**
 * Export votes as CSV
 */
export async function exportVotesCSV(): Promise<ApiResponse<string>> {
  try {
    const votes = await adminQueries.getAllVotes();

    // CSV header
    const headers = [
      'Vote ID',
      'User ID',
      'User Email',
      'User Name',
      'Team ID',
      'Team Name',
      'Is Final Vote',
      'Public Note',
      'Submitted At',
    ];

    // CSV rows
    const rows = votes.map((vote) => [
      vote.vote_id,
      vote.user_id,
      vote.user_email,
      vote.user_name,
      vote.team_id,
      vote.team_name,
      vote.is_final_vote ? 'Yes' : 'No',
      vote.public_note || '',
      vote.submitted_at.toISOString(),
    ]);

    // Escape CSV values
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(',')),
    ];

    const csv = csvLines.join('\n');

    return { success: true, data: csv };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export votes',
    };
  }
}

/**
 * Export votes as JSON
 */
export async function exportVotesJSON(): Promise<ApiResponse<adminQueries.VoteWithDetails[]>> {
  try {
    const votes = await adminQueries.getAllVotes();
    return { success: true, data: votes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export votes',
    };
  }
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<ApiResponse<User[]>> {
  try {
    const userRows = await authQueries.getAllUsers();
    const users = userRows.map(rowToUser);
    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    };
  }
}

/**
 * Get all teams with details
 */
export async function getAllTeamsWithDetails(): Promise<ApiResponse<Team[]>> {
  try {
    const teamRows = await teamsQueries.getAllTeams();
    const teams = teamRows.map(rowToTeam);
    return { success: true, data: teams };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch teams',
    };
  }
}

/**
 * Reset voting system
 * WARNING: This deletes all votes and resets presentation queue
 */
export async function resetSystem(): Promise<ApiResponse<void>> {
  try {
    await transaction(async (client) => {
      // Delete all votes
      await client.query('DELETE FROM votes');

      // Delete all private notes
      await client.query('DELETE FROM private_notes');

      // Reset presentations
      await client.query("UPDATE presentations SET status = 'upcoming', started_at = NULL, completed_at = NULL");

      // Reset teams presentation status
      await client.query('UPDATE teams SET has_presented = FALSE, presentation_order = NULL');

      // Reset timer
      await client.query(
        `UPDATE timer_state
         SET is_active = FALSE, started_at = NULL, paused_at = NULL, elapsed_seconds = 0, presentation_id = NULL
         WHERE id = 'global'`
      );
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset system',
    };
  }
}

// Export service object for consistency
export const adminService = {
  getSystemStatistics,
  getAllVotes,
  getVoteStatistics,
  exportVotesCSV,
  exportVotesJSON,
  getAllUsers,
  getAllTeamsWithDetails,
  resetSystem,
};
