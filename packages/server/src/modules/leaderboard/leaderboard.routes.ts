/**
 * Leaderboard Routes
 *
 * OWNERSHIP: AGENT_LEADER
 * HTTP endpoints for leaderboard operations
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { leaderboardService } from './leaderboard.service';
import type { ApiResponse, LeaderboardEntry } from '@priv/types';

const router = Router();

// Validation schemas
const TeamIdParamSchema = z.object({
  teamId: z.string().min(1),
});

const RegisterTeamBodySchema = z.object({
  teamId: z.string().min(1),
  teamName: z.string().min(1).max(100),
  voteCount: z.number().int().min(0).default(0),
  hasPresented: z.boolean().default(false),
});

/**
 * GET /api/leaderboard
 * Get the current leaderboard with rankings
 */
router.get('/', (_req: Request, res: Response<ApiResponse<LeaderboardEntry[]>>) => {
  try {
    const leaderboard = leaderboardService.getLeaderboard();
    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch leaderboard';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/leaderboard/:teamId
 * Get a specific team's leaderboard entry
 */
router.get('/:teamId', (req: Request, res: Response<ApiResponse<LeaderboardEntry>>) => {
  try {
    const { teamId } = TeamIdParamSchema.parse(req.params);
    const entry = leaderboardService.getTeamEntry(teamId);

    if (!entry) {
      res.status(404).json({
        success: false,
        error: `Team ${teamId} not found`,
      });
      return;
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid team ID',
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch team entry';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/leaderboard/teams
 * Register a new team for the leaderboard
 */
router.post('/teams', (req: Request, res: Response<ApiResponse<LeaderboardEntry[]>>) => {
  try {
    const data = RegisterTeamBodySchema.parse(req.body);
    leaderboardService.registerTeam(data);
    const leaderboard = leaderboardService.getLeaderboard();

    res.status(201).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to register team';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/leaderboard/:teamId/vote
 * Increment vote count for a team
 */
router.post('/:teamId/vote', (req: Request, res: Response<ApiResponse<LeaderboardEntry[]>>) => {
  try {
    const { teamId } = TeamIdParamSchema.parse(req.params);
    const leaderboard = leaderboardService.incrementVote(teamId);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid team ID',
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to record vote';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/leaderboard/:teamId/vote
 * Decrement vote count for a team (vote retraction)
 */
router.delete('/:teamId/vote', (req: Request, res: Response<ApiResponse<LeaderboardEntry[]>>) => {
  try {
    const { teamId } = TeamIdParamSchema.parse(req.params);
    const leaderboard = leaderboardService.decrementVote(teamId);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid team ID',
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to retract vote';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/leaderboard/:teamId/presented
 * Mark a team as having presented
 */
router.post('/:teamId/presented', (req: Request, res: Response<ApiResponse<LeaderboardEntry[]>>) => {
  try {
    const { teamId } = TeamIdParamSchema.parse(req.params);
    const leaderboard = leaderboardService.markTeamAsPresented(teamId);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid team ID',
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update team status';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/leaderboard/reset
 * Reset all vote counts (admin only in production)
 */
router.post('/reset', (_req: Request, res: Response<ApiResponse<null>>) => {
  try {
    leaderboardService.resetVotes();
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset votes';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export const leaderboardRoutes = router;
