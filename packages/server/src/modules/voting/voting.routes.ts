/**
 * Voting Routes
 *
 * HTTP endpoints for vote submission and ranking retrieval.
 * All routes require authentication.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { UserId, TeamId } from '@voting/shared';
import type { VotingContext } from './voting.types';
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

// ============================================================================
// TYPES
// ============================================================================

interface AuthVariables {
  userId: UserId;
  userTeamId: TeamId | null;
  isAdmin: boolean;
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const votingRouter = new Hono<{ Variables: AuthVariables }>();

// ============================================================================
// MIDDLEWARE - Authentication Check
// ============================================================================

votingRouter.use('*', async (c, next) => {
  // In production, this would verify JWT/session
  const userId = c.req.header('X-User-Id');
  const userTeamId = c.req.header('X-User-Team-Id');
  const isAdmin = c.req.header('X-User-Admin') === 'true';

  if (!userId) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  c.set('userId', userId);
  c.set('userTeamId', userTeamId || null);
  c.set('isAdmin', isAdmin);

  await next();
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/voting/vote
 * Submit a vote for a team
 */
votingRouter.post(
  '/vote',
  zValidator('json', submitVoteSchema),
  async (c) => {
    const body = c.req.valid('json');
    const context: VotingContext = {
      userId: c.get('userId'),
      userTeamId: c.get('userTeamId'),
      isAdmin: c.get('isAdmin'),
    };

    const result = await submitVote(body, context);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result, 201);
  }
);

/**
 * GET /api/voting/rankings
 * Get current user's rankings and notes
 */
votingRouter.get('/rankings', async (c) => {
  const userId = c.get('userId');
  const result = await getUserRankings(userId);

  if (!result.success) {
    return c.json(result, 400);
  }

  return c.json(result);
});

/**
 * PUT /api/voting/notes
 * Update a private note for a team
 */
votingRouter.put(
  '/notes',
  zValidator('json', updatePrivateNoteSchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId');

    const result = await updatePrivateNote(body, userId);

    if (!result.success) {
      return c.json(result, 400);
    }

    return c.json(result);
  }
);

/**
 * GET /api/voting/team/:teamId/count
 * Get vote count for a specific team (admin only in production)
 */
votingRouter.get('/team/:teamId/count', async (c) => {
  const teamId = c.req.param('teamId');

  // Validate UUID format
  const uuidSchema = z.string().uuid();
  const parseResult = uuidSchema.safeParse(teamId);
  if (!parseResult.success) {
    return c.json({ success: false, error: 'Invalid team ID' }, 400);
  }

  const count = await getVoteCount(teamId);

  return c.json({
    success: true,
    data: { teamId, count },
  });
});

/**
 * GET /api/voting/status
 * Get current voting status (open/closed)
 */
votingRouter.get('/status', async (c) => {
  const open = await isVotingOpen();

  return c.json({
    success: true,
    data: { isOpen: open },
  });
});

/**
 * POST /api/voting/admin/toggle
 * Toggle voting open/closed (admin only)
 */
votingRouter.post('/admin/toggle', async (c) => {
  const isAdmin = c.get('isAdmin');

  if (!isAdmin) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  const currentStatus = await isVotingOpen();
  await setVotingOpen(!currentStatus);

  return c.json({
    success: true,
    data: { isOpen: !currentStatus },
  });
});

// ============================================================================
// EXPORT
// ============================================================================

export { votingRouter };
export default votingRouter;
