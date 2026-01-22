/**
 * Team Routes
 *
 * OWNERSHIP: AGENT_TEAMS
 * HTTP route handlers for team management API
 */

import { Router, type Request, type Response } from 'express';
import { teamsService } from './teams.service';
import {
  createTeamSchema,
  updateTeamSchema,
  addMembersSchema,
  removeMembersSchema,
  teamIdSchema,
} from './teams.validation';
import type { TeamId, UserId } from '@priv/types';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../auth/auth.middleware';
import { generalRateLimiter } from '../../core/api/rateLimit';
import { validateBody, validateParams, teamIdParamSchema, userIdParamSchema } from '../../core/api/validation';
import { successResponse } from '../../core/api/response';
import { NotFoundError, ValidationError } from '../../core/api/errors';
import { logAudit, createAuditLog } from '../../core/api/audit';
import { broadcaster } from '../../core/socket';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// All team routes require authentication
router.use(requireAuth);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/teams
 * Get all teams
 */
router.get('/', generalRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await teamsService.getAllTeams();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/teams/:teamId
 * Get a team by ID
 */
router.get(
  '/:teamId',
  generalRateLimiter,
  validateParams(teamIdParamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const teamId = req.params.teamId as TeamId;
      const result = await teamsService.getTeamById(teamId);

      if (result.success) {
        res.json(successResponse(result.data));
      } else if (result.error === 'Team not found') {
        throw new NotFoundError('Team', teamId);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Get team error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch team',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/teams/:teamId/members
 * Get a team with its members
 */
router.get(
  '/:teamId/members',
  generalRateLimiter,
  validateParams(teamIdParamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const teamId = req.params.teamId as TeamId;
      const result = await teamsService.getTeamWithMembers(teamId);

      if (result.success) {
        res.json(successResponse(result.data));
      } else if (result.error === 'Team not found') {
        throw new NotFoundError('Team', teamId);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Get team members error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch team members',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/teams
 * Create a new team (admin only)
 */
router.post(
  '/',
  requireAdmin,
  generalRateLimiter,
  validateBody(createTeamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await teamsService.createTeam(req.body);

      if (result.success) {
        logAudit(createAuditLog(req, 'team:create', 'team', result.data.id, true));
        broadcaster.team('created', result.data);
        res.status(201).json(successResponse(result.data));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Create team error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create team',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * PATCH /api/v1/teams/:teamId
 * Update a team (admin only)
 */
router.patch(
  '/:teamId',
  requireAdmin,
  generalRateLimiter,
  validateParams(teamIdParamSchema),
  validateBody(updateTeamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const teamId = req.params.teamId as TeamId;
      const result = await teamsService.updateTeam(teamId, req.body);

      if (result.success) {
        logAudit(createAuditLog(req, 'team:update', 'team', teamId, true));
        broadcaster.team('updated', result.data);
        res.json(successResponse(result.data));
      } else if (result.error === 'Team not found') {
        throw new NotFoundError('Team', teamId);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Update team error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update team',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * DELETE /api/v1/teams/:teamId
 * Delete a team (admin only)
 */
router.delete(
  '/:teamId',
  requireAdmin,
  generalRateLimiter,
  validateParams(teamIdParamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const teamId = req.params.teamId as TeamId;
      const result = await teamsService.deleteTeam(teamId);

      if (result.success) {
        logAudit(createAuditLog(req, 'team:delete', 'team', teamId, true));
        broadcaster.team('deleted', { id: teamId });
        res.status(204).send();
      } else if (result.error === 'Team not found') {
        throw new NotFoundError('Team', teamId);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Delete team error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete team',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/teams/:teamId/members
 * Add members to a team (admin only)
 */
router.post(
  '/:teamId/members',
  requireAdmin,
  generalRateLimiter,
  validateParams(teamIdParamSchema),
  validateBody(addMembersSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const teamId = req.params.teamId as TeamId;
      const result = await teamsService.assignMembers(teamId, req.body.memberIds);

      if (result.success) {
        logAudit(createAuditLog(req, 'team:members:add', 'team', teamId, true));
        broadcaster.team('updated', result.data);
        res.json(successResponse(result.data));
      } else if (result.error === 'Team not found') {
        throw new NotFoundError('Team', teamId);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Add team members error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add team members',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * DELETE /api/v1/teams/:teamId/members
 * Remove members from a team (admin only)
 */
router.delete(
  '/:teamId/members',
  requireAdmin,
  generalRateLimiter,
  validateParams(teamIdParamSchema),
  validateBody(removeMembersSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const teamId = req.params.teamId as TeamId;
      const result = await teamsService.removeMembers(teamId, req.body.memberIds);

      if (result.success) {
        logAudit(createAuditLog(req, 'team:members:remove', 'team', teamId, true));
        broadcaster.team('updated', result.data);
        res.json(successResponse(result.data));
      } else if (result.error === 'Team not found') {
        throw new NotFoundError('Team', teamId);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Remove team members error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove team members',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/teams/user/:userId
 * Get the team for a specific user
 */
router.get(
  '/user/:userId',
  generalRateLimiter,
  validateParams(userIdParamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId as UserId;
      const result = await teamsService.getUserTeam(userId);

      if (result.success) {
        res.json(successResponse(result.data));
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Get user team error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user team',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export { router as teamsRoutes };
export default router;
