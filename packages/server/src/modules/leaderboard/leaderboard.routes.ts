/**
 * Leaderboard Routes
 *
 * OWNERSHIP: AGENT_LEADER
 * HTTP endpoints for leaderboard operations
 */

import { Router, type Request, type Response } from 'express';
import { leaderboardService } from './leaderboard.service';
import type { LeaderboardEntry } from '@voting/shared';
import { generalRateLimiter } from '../../core/api/rateLimit';
import { validateParams, teamIdParamSchema } from '../../core/api/validation';
import { successResponse } from '../../core/api/response';
import { NotFoundError } from '../../core/api/errors';

const router = Router();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/leaderboard
 * Get the current leaderboard with rankings
 * Uses database queries for real-time calculation
 */
router.get('/', generalRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const leaderboard = await leaderboardService.getLeaderboard();
    res.json(successResponse(leaderboard));
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/leaderboard/stats
 * Get leaderboard statistics
 */
router.get('/stats', generalRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await leaderboardService.getLeaderboardStats();
    res.json(successResponse(stats));
  } catch (error) {
    console.error('Get leaderboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard statistics',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/leaderboard/:teamId
 * Get a specific team's leaderboard entry
 */
router.get(
  '/:teamId',
  generalRateLimiter,
  validateParams(teamIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { teamId } = req.params;
      const entry = await leaderboardService.getTeamEntry(teamId);

      if (!entry) {
        throw new NotFoundError('Team', teamId);
      }

      res.json(successResponse(entry));
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Get team entry error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch team entry',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export const leaderboardRoutes = router;
