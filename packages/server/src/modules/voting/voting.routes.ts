/**
 * Voting Routes
 *
 * HTTP endpoints for vote submission and ranking retrieval.
 * All routes require authentication.
 *
 * OWNERSHIP: AGENT_VOTING
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  submitVote,
  getUserRankings,
  updatePrivateNote,
  getVoteCount,
  isVotingOpen,
  setVotingOpen,
  submitVoteSchema,
  updatePrivateNoteSchema,
} from './voting.service';
import * as votingQueries from './voting.queries';
import { broadcaster } from '../../core/socket';
import { leaderboardService } from '../leaderboard/leaderboard.service';
import { userIdAuth, requireAuth, type AuthenticatedRequest } from '../auth/auth.middleware';
import { voteRateLimiter } from '../../core/api/rateLimit';
import { validateBody, validateParams, teamIdParamSchema } from '../../core/api/validation';
import { successResponse } from '../../core/api/response';
import { logAudit, createAuditLog } from '../../core/api/audit';
import * as authQueries from '../auth/auth.queries';
import * as teamsQueries from '../teams/teams.queries';
import type { VotingContext } from './voting.types';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// All voting routes support X-User-Id header OR JWT authentication
// userIdAuth checks X-User-Id first, requireAuth falls back to JWT
router.use(userIdAuth);
router.use(requireAuth);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get voting context from authenticated request
 */
async function getVotingContext(req: AuthenticatedRequest): Promise<VotingContext> {
  const userId = req.user.userId;
  const userTeamId = await authQueries.getUserTeamId(userId);
  const isAdmin = req.user.role === 'admin';

  return {
    userId,
    userTeamId,
    isAdmin,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/v1/votes
 * Submit a vote for a team
 */
router.post(
  '/',
  voteRateLimiter,
  validateBody(submitVoteSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const context = await getVotingContext(req);
      const result = await submitVote(req.body, context);

      if (!result.success) {
        // Log failed vote attempt
        logAudit(
          createAuditLog(req, 'vote:submit', 'vote', req.body.teamId, false, result.error)
        );

        const statusCode =
          result.error?.includes('already') || result.error?.includes('self')
            ? 422
            : result.error?.includes('not found')
              ? 404
              : 400;
        res.status(statusCode).json(result);
        return;
      }

      // Log successful vote
      logAudit(createAuditLog(req, 'vote:submit', 'vote', result.data?.vote.id, true));

      // Broadcast vote submitted event
      broadcaster.vote(result.data?.vote);

      // If it's a final vote, broadcast updated leaderboard
      if (result.data?.vote.isFinalVote) {
        const leaderboard = await leaderboardService.getLeaderboard();
        broadcaster.leaderboard(leaderboard);
      }

      res.status(201).json(successResponse(result.data));
    } catch (error) {
      console.error('Vote submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit vote',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/votes/me
 * Get current user's submitted votes
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const votes = await votingQueries.getUserVotesWithTeams(userId);
    const finalVote = votes.find(v => v.is_final_vote) || null;

    res.json(successResponse({
      votes,
      finalVote,
      hasVoted: finalVote !== null,
    }));
  } catch (error) {
    console.error('Get user votes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your votes',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/votes/notes/export
 * Export user's notes and rankings (JSON or CSV)
 */
router.get('/notes/export', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const format = req.query.format as string || 'json';
    const notes = await votingQueries.getUserNotesForExport(userId);

    if (format === 'csv') {
      // CSV format
      const header = 'Rank,Team,Note,Is Final Vote,Last Updated';
      const rows = notes.map(n =>
        `${n.ranking},"${n.team_name}","${(n.note || '').replace(/"/g, '""')}",${n.is_final_vote ? 'Yes' : 'No'},${n.updated_at}`
      );
      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="my-rankings.csv"');
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="my-rankings.json"');
      res.json(notes);
    }
  } catch (error) {
    console.error('Export notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export notes',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/votes/rankings
 * Get current user's rankings and notes
 */
router.get('/rankings', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const result = await getUserRankings(userId);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(successResponse(result.data));
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rankings',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/v1/votes/notes
 * Update a private note for a team
 */
router.put(
  '/notes',
  validateBody(updatePrivateNoteSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.userId;
      const result = await updatePrivateNote(req.body, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(successResponse(result.data));
    } catch (error) {
      console.error('Update note error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update note',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/votes/teams/:teamId/count
 * Get vote count for a specific team
 */
router.get(
  '/teams/:teamId/count',
  validateParams(teamIdParamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { teamId } = req.params;
      const count = await getVoteCount(teamId);

      res.json(successResponse({ teamId, count }));
    } catch (error) {
      console.error('Get vote count error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get vote count',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/votes/status
 * Get current voting status (open/closed)
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isOpen = await isVotingOpen();
    res.json(successResponse({ isOpen }));
  } catch (error) {
    console.error('Get voting status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voting status',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/votes/toggle
 * Toggle voting open/closed
 */
router.post(
  '/toggle',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const currentStatus = await isVotingOpen();
      await setVotingOpen(!currentStatus);

      // Log admin action
      logAudit(
        createAuditLog(
          req,
          'voting:toggle',
          'voting',
          undefined,
          true,
          `Voting ${!currentStatus ? 'opened' : 'closed'}`
        )
      );

      res.json(successResponse({ isOpen: !currentStatus }));
    } catch (error) {
      console.error('Toggle voting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle voting',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export { router as votingRoutes };
export default router;
