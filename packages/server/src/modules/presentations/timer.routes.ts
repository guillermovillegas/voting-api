/**
 * Timer Routes
 *
 * HTTP endpoints for timer management.
 *
 * OWNERSHIP: AGENT_PRESENT
 */

import { Router, type Request, type Response } from 'express';
import * as timerService from './timer.service';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../auth/auth.middleware';
import { generalRateLimiter } from '../../core/api/rateLimit';
import { validateBody } from '../../core/api/validation';
import { z } from 'zod';
import { successResponse } from '../../core/api/response';
import { ValidationError } from '../../core/api/errors';
import { logAudit, createAuditLog } from '../../core/api/audit';
import { broadcaster } from '../../core/socket';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// All timer routes require authentication
router.use(requireAuth);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/timer
 * Get current timer state
 */
router.get('/', generalRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await timerService.getTimerState();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get timer state error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timer state',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/timer/start
 * Start timer (admin only)
 * Requires presentationId in body
 */
router.post(
  '/start',
  requireAdmin,
  generalRateLimiter,
  validateBody(z.object({ presentationId: z.string().uuid('Invalid presentation ID') })),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { presentationId } = req.body;
      const result = await timerService.startTimer(presentationId);

      if (result.success) {
        logAudit(createAuditLog(req, 'timer:start', 'timer', presentationId, true));
        broadcaster.timer(result.data);
        res.json(successResponse(result.data));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Start timer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start timer',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/timer/pause
 * Pause timer (admin only)
 */
router.post(
  '/pause',
  requireAdmin,
  generalRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await timerService.pauseTimer();

      if (result.success) {
        logAudit(createAuditLog(req, 'timer:pause', 'timer', undefined, true));
        broadcaster.timer(result.data);
        res.json(successResponse(result.data));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Pause timer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause timer',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/timer/reset
 * Reset timer (admin only)
 */
router.post(
  '/reset',
  requireAdmin,
  generalRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await timerService.resetTimer();

      if (result.success) {
        logAudit(createAuditLog(req, 'timer:reset', 'timer', undefined, true));
        broadcaster.timer(result.data);
        res.json(successResponse(result.data));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Reset timer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset timer',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * PUT /api/v1/timer/duration
 * Update timer duration (admin only)
 */
router.put(
  '/duration',
  requireAdmin,
  generalRateLimiter,
  validateBody(z.object({ durationSeconds: z.number().int().min(1).max(3600) })),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { durationSeconds } = req.body;
      const result = await timerService.updateTimerDuration(durationSeconds);

      if (result.success) {
        logAudit(
          createAuditLog(
            req,
            'timer:duration:update',
            'timer',
            undefined,
            true,
            `Duration set to ${durationSeconds}s`
          )
        );
        broadcaster.timer(result.data);
        res.json(successResponse(result.data));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Update timer duration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update timer duration',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/timer/remaining
 * Get remaining time
 */
router.get('/remaining', generalRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await timerService.getRemainingTime();
    if (result.success) {
      res.json(successResponse({ remainingSeconds: result.data }));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get remaining time error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate remaining time',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as timerRoutes };
export default router;
