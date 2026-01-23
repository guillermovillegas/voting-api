/**
 * Admin Routes
 *
 * HTTP endpoints for system statistics and management.
 * All routes require authentication (no role restrictions).
 *
 * OWNERSHIP: AGENT_ADMIN
 */

import { Router, type Request, type Response } from 'express';
import * as adminService from './admin.service';
import { userIdAuth, requireAuth, type AuthenticatedRequest } from '../auth/auth.middleware';
import { adminRateLimiter, strictRateLimiter } from '../../core/api/rateLimit';
import { validateParams, teamIdParamSchema, userIdParamSchema } from '../../core/api/validation';
import { successResponse } from '../../core/api/response';
import { NotFoundError } from '../../core/api/errors';
import { logAudit, createAuditLog } from '../../core/api/audit';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// All routes support X-User-Id header OR JWT authentication
router.use(userIdAuth);
router.use(requireAuth);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/admin/stats
 * Get system statistics
 */
router.get('/stats', adminRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await adminService.getSystemStatistics();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system statistics',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/admin/votes
 * Get all votes (transparency view)
 */
router.get('/votes', adminRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await adminService.getAllVotes();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get all votes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch votes',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/admin/votes/statistics
 * Get vote statistics
 */
router.get('/votes/statistics', adminRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await adminService.getVoteStatistics();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get vote statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vote statistics',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/admin/votes/export
 * Export votes (CSV or JSON based on ?format query param)
 */
router.get('/votes/export', adminRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string | undefined;

    if (format === 'csv') {
      const result = await adminService.exportVotesCSV();
      if (result.success) {
        logAudit(createAuditLog(req, 'admin:export:votes', 'votes', undefined, true, 'CSV'));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="votes-export.csv"');
        res.send(result.data);
      } else {
        res.status(500).json(result);
      }
    } else {
      // Default to JSON (raw payload for export)
      const result = await adminService.exportVotesJSON();
      if (result.success) {
        logAudit(createAuditLog(req, 'admin:export:votes', 'votes', undefined, true, 'JSON'));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="votes-export.json"');
        res.send(JSON.stringify(result.data, null, 2));
      } else {
        res.status(500).json(result);
      }
    }
  } catch (error) {
    console.error('Export votes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export votes',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/admin/users
 * Get all users
 */
router.get('/users', adminRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await adminService.getAllUsers();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/admin/teams
 * Get all teams with details
 */
router.get('/teams', adminRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await adminService.getAllTeamsWithDetails();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/admin/reset
 * Reset voting system (admin only, strict rate limit)
 * WARNING: This deletes all votes and resets the system
 */
router.post(
  '/reset',
  strictRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await adminService.resetSystem();

      if (result.success) {
        logAudit(createAuditLog(req, 'admin:system:reset', 'system', undefined, true));
        res.json(successResponse(null));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Reset system error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset system',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export { router as adminRoutes };
export default router;
