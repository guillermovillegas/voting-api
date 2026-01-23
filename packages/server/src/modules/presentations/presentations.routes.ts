/**
 * Presentations Routes
 *
 * HTTP endpoints for presentation queue management.
 *
 * OWNERSHIP: AGENT_PRESENT
 */

import { Router, type Request, type Response } from 'express';
import * as presentationsService from './presentations.service';
import { requireAuth, type AuthenticatedRequest } from '../auth/auth.middleware';
import { generalRateLimiter } from '../../core/api/rateLimit';
import { validateParams, presentationIdParamSchema } from '../../core/api/validation';
import { successResponse } from '../../core/api/response';
import { NotFoundError } from '../../core/api/errors';
import { logAudit, createAuditLog } from '../../core/api/audit';
import { broadcaster } from '../../core/socket';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// All presentation routes require authentication
router.use(requireAuth);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/presentations
 * Get all presentations
 */
router.get('/', generalRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await presentationsService.getAllPresentations();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get presentations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch presentations',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/presentations/current
 * Get current presentation
 */
router.get('/current', generalRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await presentationsService.getCurrentPresentation();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get current presentation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current presentation',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/presentations/upcoming
 * Get upcoming presentations
 */
router.get('/upcoming', generalRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await presentationsService.getUpcomingPresentations();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get upcoming presentations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming presentations',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/presentations/completed
 * Get completed presentations
 */
router.get('/completed', generalRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await presentationsService.getCompletedPresentations();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get completed presentations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch completed presentations',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/presentations/status
 * Get queue status
 */
router.get('/status', generalRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await presentationsService.getQueueStatus();
    if (result.success) {
      res.json(successResponse(result.data));
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/presentations/:id
 * Get presentation by ID
 */
router.get(
  '/:id',
  generalRateLimiter,
  validateParams(presentationIdParamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await presentationsService.getPresentationById(req.params.id);
      if (result.success) {
        res.json(successResponse(result.data));
      } else if (result.error === 'Presentation not found') {
        throw new NotFoundError('Presentation', req.params.id);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Get presentation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch presentation',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/presentations/initialize
 * Initialize presentation queue
 * Creates presentations for all teams and randomizes order
 */
router.post(
  '/initialize',
  generalRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await presentationsService.initializeQueue();
      if (result.success) {
        logAudit(createAuditLog(req, 'presentations:initialize', 'presentations', undefined, true));
        broadcaster.presentation({ action: 'initialized', presentations: result.data });
        res.status(201).json(successResponse(result.data));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Initialize queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize presentation queue',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/presentations/:id/start
 * Start a presentation
 */
router.post(
  '/:id/start',
  generalRateLimiter,
  validateParams(presentationIdParamSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await presentationsService.startPresentation(req.params.id);
      if (result.success) {
        logAudit(createAuditLog(req, 'presentation:start', 'presentation', req.params.id, true));
        broadcaster.presentation({ action: 'started', presentation: result.data });
        res.json(successResponse(result.data));
      } else if (result.error === 'Presentation not found') {
        throw new NotFoundError('Presentation', req.params.id);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Start presentation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start presentation',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/presentations/next
 * Advance to next presentation
 */
router.post(
  '/next',
  generalRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await presentationsService.advanceToNext();
      if (result.success) {
        logAudit(createAuditLog(req, 'presentation:advance', 'presentations', undefined, true));
        broadcaster.presentation({ action: 'advanced', presentation: result.data });
        res.json(successResponse(result.data));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Advance presentation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to advance to next presentation',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/presentations/reset
 * Reset presentation queue
 */
router.post(
  '/reset',
  generalRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await presentationsService.resetQueue();
      if (result.success) {
        logAudit(createAuditLog(req, 'presentations:reset', 'presentations', undefined, true));
        broadcaster.presentation({ action: 'reset' });
        res.json(successResponse(null));
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Reset queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset presentation queue',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export { router as presentationsRoutes };
export default router;
