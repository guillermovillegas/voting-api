/**
 * Auth Routes
 * Handles login, register, logout, and token refresh endpoints
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  AuthService,
  loginSchema,
  registerSchema,
  hashPassword,
  verifyPassword,
  generateToken,
  refreshAccessToken,
  verifyToken,
} from './auth.service';
import { requireAuth, type AuthenticatedRequest } from './auth.middleware';
import { query } from '../../core/db/client';
import type { User } from '@voting/shared';
import * as authQueries from './auth.queries';
import type { UserRow } from '../../core/db/types';
import { authRateLimiter, strictRateLimiter } from '../../core/api/rateLimit';
import { validateBody } from '../../core/api/validation';
import { successResponse, errorResponse } from '../../core/api/response';
import { ConflictError, ValidationError, UnauthorizedError, NotFoundError } from '../../core/api/errors';
import { logAudit, createAuditLog } from '../../core/api/audit';

const router = Router();

const tokenExchangeSchema = z.union([
  z.object({
    grantType: z.literal('refresh_token'),
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
  z.object({
    grantType: z.literal('password'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
]);

// Helper to convert UserRow to User
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

/**
 * POST /api/v1/auth/token
 * Token exchange endpoint (password or refresh token)
 */
router.post(
  '/token',
  authRateLimiter,
  validateBody(tokenExchangeSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body;

      if (input.grantType === 'refresh_token') {
        const payload = verifyToken(input.refreshToken);
        if (!payload) {
          throw new UnauthorizedError('Invalid or expired refresh token');
        }

        const userRow = await authQueries.findUserById(payload.userId);
        if (!userRow) {
          throw new NotFoundError('User', payload.userId);
        }

        const user = rowToUser(userRow);
        const tokens = refreshAccessToken(input.refreshToken, user);
        if (!tokens) {
          throw new UnauthorizedError('Failed to exchange refresh token');
        }

        res.json(successResponse(tokens));
        return;
      }

      // Password grant
      const userRow = await authQueries.findUserByEmail(input.email);
      if (!userRow) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isValidPassword = await verifyPassword(input.password, userRow.password);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const user = rowToUser(userRow);
      const tokens = generateToken(user);

      logAudit(createAuditLog(req, 'user:token:exchange', 'user', user.id, true));

      res.json(successResponse(tokens));
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Token exchange error:', error);
      res.status(500).json(
        errorResponse('An unexpected error occurred', 'INTERNAL_SERVER_ERROR', 500)
      );
    }
  }
);

/**
 * POST /api/v1/auth/register
 * Register a new user account
 */
router.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body;

      // Check if email already exists
      const existingUser = await authQueries.findUserByEmail(input.email);
      if (existingUser) {
        throw new ConflictError('An account with this email already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(input.password);

      // Create new user in database
      const userRow = await authQueries.createUser({
        email: input.email,
        password: passwordHash,
        name: input.name,
        role: 'voter', // Default role
      });

      const newUser = rowToUser(userRow);

      // Generate tokens
      const tokens = generateToken(newUser);

      // Log registration
      logAudit(createAuditLog(req, 'user:register', 'user', newUser.id, true));

      res.status(201).json(
        successResponse({
          user: newUser,
          ...tokens,
        })
      );
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Register error:', error);
      res.status(500).json(
        errorResponse('An unexpected error occurred during registration', 'INTERNAL_SERVER_ERROR', 500)
      );
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens
 */
router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body;

      // Find user by email from database
      const userRow = await authQueries.findUserByEmail(input.email);
      if (!userRow) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await verifyPassword(input.password, userRow.password);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const user = rowToUser(userRow);

      // Generate tokens
      const tokens = generateToken(user);

      // Log successful login
      logAudit(createAuditLog(req, 'user:login', 'user', user.id, true));

      res.json(
        successResponse({
          user,
          ...tokens,
        })
      );
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ValidationError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Login error:', error);
      res.status(500).json(
        errorResponse('An unexpected error occurred during login', 'INTERNAL_SERVER_ERROR', 500)
      );
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Invalidate user session (client should discard tokens)
 */
router.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  // In a production app, you would:
  // 1. Add the token to a blacklist
  // 2. Invalidate refresh token in database
  // 3. Clear any server-side session

  logAudit(createAuditLog(req, 'user:logout', 'user', req.user.userId, true));

  res.json(successResponse({ message: 'Successfully logged out.' }));
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  authRateLimiter,
  validateBody(z.object({ refreshToken: z.string().min(1, 'Refresh token is required') })),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const payload = verifyToken(refreshToken);
      if (!payload) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Get user from database
      const userRow = await authQueries.findUserById(payload.userId);
      if (!userRow) {
        throw new NotFoundError('User', payload.userId);
      }

      const user = rowToUser(userRow);

      // Generate new tokens
      const tokens = refreshAccessToken(refreshToken, user);
      if (!tokens) {
        throw new UnauthorizedError('Failed to refresh token');
      }

      res.json(successResponse(tokens));
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Token refresh error:', error);
      res.status(500).json(
        errorResponse('An unexpected error occurred', 'INTERNAL_SERVER_ERROR', 500)
      );
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRow = await authQueries.findUserById(req.user.userId);

    if (!userRow) {
      throw new NotFoundError('User', req.user.userId);
    }

    const user = rowToUser(userRow);

    res.json(successResponse(user));
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json(error.toProblemDetails());
      return;
    }
    console.error('Get user error:', error);
    res.status(500).json(
      errorResponse('An unexpected error occurred', 'INTERNAL_SERVER_ERROR', 500)
    );
  }
});

/**
 * PUT /api/v1/auth/password
 * Change user password
 */
router.put(
  '/password',
  requireAuth,
  strictRateLimiter,
  validateBody(
    z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: AuthService.passwordSchema,
    })
  ),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user from database
      const userRow = await authQueries.findUserById(req.user.userId);
      if (!userRow) {
        throw new NotFoundError('User', req.user.userId);
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, userRow.password);
      if (!isValidPassword) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Hash and save new password to database
      const newPasswordHash = await hashPassword(newPassword);
      await authQueries.updateUserPassword(req.user.userId, newPasswordHash);

      // Log password change
      logAudit(createAuditLog(req, 'user:password:change', 'user', req.user.userId, true));

      res.json(successResponse({ message: 'Password updated successfully.' }));
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof UnauthorizedError ||
        error instanceof ValidationError
      ) {
        res.status(error.statusCode).json(error.toProblemDetails());
        return;
      }
      console.error('Password change error:', error);
      res.status(500).json(
        errorResponse('An unexpected error occurred', 'INTERNAL_SERVER_ERROR', 500)
      );
    }
  }
);

/**
 * POST /api/v1/auth/setup
 * Setup user with name and team (for training sessions)
 * Uses X-User-Id header for identification
 */
router.post(
  '/setup',
  validateBody(
    z.object({
      name: z.string().min(1, 'Name is required').max(100),
      teamId: z.string().uuid('Invalid team ID'),
    })
  ),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'];
      const userName = req.headers['x-user-name'];

      if (!userId || typeof userId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'X-User-Id header is required',
          code: 'MISSING_USER_ID',
        });
        return;
      }

      const { name, teamId } = req.body;

      // Find or create user
      let userRow = await authQueries.findUserById(userId);

      if (!userRow) {
        // Create new user with provided info
        userRow = await authQueries.createUser({
          email: `training-${userId}@voting.app`,
          password: '',
          name: name,
          role: 'voter',
          teamId: teamId,
        });

        // Update the ID to match the provided one (for training mode)
        await query(
          `UPDATE users SET id = $1 WHERE id = $2`,
          [userId, userRow.id]
        );
        userRow.id = userId;
      } else {
        // Update existing user
        await query(
          `UPDATE users SET name = $1, team_id = $2, updated_at = NOW() WHERE id = $3`,
          [name, teamId, userId]
        );
        userRow.name = name;
        userRow.team_id = teamId;
      }

      const user = rowToUser(userRow);

      logAudit(createAuditLog(req, 'user:setup', 'user', user.id, true));

      res.json(
        successResponse({
          user,
          message: 'Setup complete',
        })
      );
    } catch (error) {
      console.error('Setup error:', error);
      res.status(500).json(
        errorResponse('Failed to complete setup', 'INTERNAL_SERVER_ERROR', 500)
      );
    }
  }
);

export { router as authRouter };
export default router;
