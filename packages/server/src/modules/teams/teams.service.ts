/**
 * Team Service
 *
 * OWNERSHIP: AGENT_TEAMS
 * Business logic for team management operations
 */

import type {
  Team,
  TeamWithMembers,
  User,
  UserId,
  TeamId,
  ApiResponse,
} from '@priv/types';
import {
  TEAM_MIN_SIZE,
  TEAM_MAX_SIZE,
  validateTeamSize,
  type CreateTeamInput,
  type UpdateTeamInput,
} from './teams.validation';
import * as teamsQueries from './teams.queries';
import type { TeamRow, UserRow } from '../../core/db/types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    presentationOrder: row.presentation_order,
    hasPresented: row.has_presented,
    createdAt: row.created_at,
  };
}

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

async function getNewMemberIds(teamId: TeamId, memberIds: UserId[]): Promise<UserId[]> {
  const newMemberIds: UserId[] = [];
  for (const id of memberIds) {
    const inTeam = await teamsQueries.isUserInTeam(id, teamId);
    if (!inTeam) {
      newMemberIds.push(id);
    }
  }
  return newMemberIds;
}

async function findMemberAssignedElsewhere(
  teamId: TeamId,
  memberIds: UserId[]
): Promise<UserId | null> {
  for (const memberId of memberIds) {
    const existingTeamId = await teamsQueries.getUserTeamId(memberId);
    if (existingTeamId && existingTeamId !== teamId) {
      return memberId;
    }
  }
  return null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class TeamsService {
  /**
   * Get all teams
   */
  async getAllTeams(): Promise<ApiResponse<Team[]>> {
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
   * Get a team by ID
   */
  async getTeamById(teamId: TeamId): Promise<ApiResponse<Team>> {
    try {
      const teamRow = await teamsQueries.getTeamById(teamId);
      if (!teamRow) {
        return { success: false, error: 'Team not found' };
      }
      return { success: true, data: rowToTeam(teamRow) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch team',
      };
    }
  }

  /**
   * Get a team with its members
   */
  async getTeamWithMembers(teamId: TeamId): Promise<ApiResponse<TeamWithMembers>> {
    try {
      const teamRow = await teamsQueries.getTeamById(teamId);
      if (!teamRow) {
        return { success: false, error: 'Team not found' };
      }

      const memberRows = await teamsQueries.getTeamMembers(teamId);
      const members = memberRows.map(rowToUser);

      return {
        success: true,
        data: { ...rowToTeam(teamRow), members },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch team with members',
      };
    }
  }

  /**
   * Create a new team
   */
  async createTeam(input: CreateTeamInput): Promise<ApiResponse<Team>> {
    try {
      const teamRow = await teamsQueries.createTeam({
        name: input.name,
        presentationOrder: input.presentationOrder,
      });

      // Assign initial members if provided
      if (input.memberIds && input.memberIds.length > 0) {
        const assignResult = await this.assignMembers(teamRow.id, input.memberIds);
        if (!assignResult.success) {
          // Rollback team creation if member assignment fails
          await teamsQueries.deleteTeam(teamRow.id);
          return { success: false, error: assignResult.error };
        }
      }

      return { success: true, data: rowToTeam(teamRow) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create team',
      };
    }
  }

  /**
   * Update a team
   */
  async updateTeam(teamId: TeamId, input: UpdateTeamInput): Promise<ApiResponse<Team>> {
    try {
      const teamRow = await teamsQueries.updateTeam(teamId, {
        name: input.name,
        presentationOrder: input.presentationOrder,
        hasPresented: input.hasPresented,
      });
      return { success: true, data: rowToTeam(teamRow) };
    } catch (error) {
      if (error instanceof Error && error.message === 'Team not found') {
        return { success: false, error: 'Team not found' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update team',
      };
    }
  }

  /**
   * Delete a team
   */
  async deleteTeam(teamId: TeamId): Promise<ApiResponse<void>> {
    try {
      // Check if team exists
      const team = await teamsQueries.getTeamById(teamId);
      if (!team) {
        return { success: false, error: 'Team not found' };
      }

      // Delete team (cascade will handle member associations)
      await teamsQueries.deleteTeam(teamId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete team',
      };
    }
  }

  /**
   * Assign members to a team
   */
  async assignMembers(teamId: TeamId, memberIds: UserId[]): Promise<ApiResponse<TeamWithMembers>> {
    try {
      const team = await teamsQueries.getTeamById(teamId);
      if (!team) {
        return { success: false, error: 'Team not found' };
      }

      const currentSize = await teamsQueries.getTeamMemberCount(teamId);
      const newMemberIds = await getNewMemberIds(teamId, memberIds);

      // Validate team size
      const sizeValidation = validateTeamSize(currentSize, newMemberIds.length, 0);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }

      // Check if any users are already in other teams
      const conflictMemberId = await findMemberAssignedElsewhere(teamId, newMemberIds);
      if (conflictMemberId) {
        return {
          success: false,
          error: `User ${conflictMemberId} is already assigned to another team`,
        };
      }

      // Assign members (using transaction in query)
      for (const memberId of newMemberIds) {
        await teamsQueries.assignUserToTeam(memberId, teamId);
      }

      return this.getTeamWithMembers(teamId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign members',
      };
    }
  }

  /**
   * Remove members from a team
   */
  async removeMembers(teamId: TeamId, memberIds: UserId[]): Promise<ApiResponse<TeamWithMembers>> {
    try {
      const team = await teamsQueries.getTeamById(teamId);
      if (!team) {
        return { success: false, error: 'Team not found' };
      }

      const currentSize = await teamsQueries.getTeamMemberCount(teamId);
      const membersToRemove: UserId[] = [];
      for (const id of memberIds) {
        const inTeam = await teamsQueries.isUserInTeam(id, teamId);
        if (inTeam) {
          membersToRemove.push(id);
        }
      }

      // Validate team size after removal
      const sizeValidation = validateTeamSize(currentSize, 0, membersToRemove.length);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }

      // Remove members
      for (const memberId of membersToRemove) {
        await teamsQueries.removeUserFromTeam(memberId);
      }

      return this.getTeamWithMembers(teamId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove members',
      };
    }
  }

  /**
   * Get team for a user
   */
  async getUserTeam(userId: UserId): Promise<ApiResponse<Team | null>> {
    try {
      const teamId = await teamsQueries.getUserTeamId(userId);
      if (!teamId) {
        return { success: true, data: null };
      }

      const teamRow = await teamsQueries.getTeamById(teamId);
      if (!teamRow) {
        return { success: true, data: null };
      }

      return { success: true, data: rowToTeam(teamRow) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user team',
      };
    }
  }

  /**
   * Get team member count
   */
  async getTeamMemberCount(teamId: TeamId): Promise<ApiResponse<number>> {
    try {
      const count = await teamsQueries.getTeamMemberCount(teamId);
      return { success: true, data: count };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get member count',
      };
    }
  }

  /**
   * Validate team constraints
   */
  validateTeamConstraints(memberCount: number): { valid: boolean; message?: string } {
    if (memberCount < TEAM_MIN_SIZE) {
      return {
        valid: false,
        message: `Team must have at least ${TEAM_MIN_SIZE} members`,
      };
    }
    if (memberCount > TEAM_MAX_SIZE) {
      return {
        valid: false,
        message: `Team cannot have more than ${TEAM_MAX_SIZE} members`,
      };
    }
    return { valid: true };
  }
}

// Export singleton instance
export const teamsService = new TeamsService();
