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
import type { User, ApiResponse, UserId } from '@priv/types';

const router = Router();

// In-memory user store for development (replace with database in production)
const users = new Map<string, User & { passwordHash: string }>();

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const input = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = Array.from(users.values()).find(
      (u) => u.email === input.email
    );
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create new user
    const userId = crypto.randomUUID() as UserId;
    const now = new Date();

    const newUser: User & { passwordHash: string } = {
      id: userId,
      email: input.email,
      name: input.name,
      role: 'voter', // Default role
      teamId: null,
      createdAt: now,
      passwordHash,
    };

    users.set(userId, newUser);

    // Generate tokens
    const tokens = generateToken(newUser);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        ...tokens,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during registration.',
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const input = loginSchema.parse(req.body);

    // Find user by email
    const user = Array.from(users.values()).find((u) => u.email === input.email);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
      return;
    }

    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
      return;
    }

    // Generate tokens
    const tokens = generateToken(user);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        ...tokens,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login.',
    });
  }
});

/**
 * POST /auth/logout
 * Invalidate user session (client should discard tokens)
 */
router.post('/logout', requireAuth, (req: Request, res: Response): void => {
  // In a production app, you would:
  // 1. Add the token to a blacklist
  // 2. Invalidate refresh token in database
  // 3. Clear any server-side session

  res.json({
    success: true,
    data: { message: 'Successfully logged out.' },
  });
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required.',
      });
      return;
    }

    // Verify refresh token
    const payload = verifyToken(refreshToken);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token.',
      });
      return;
    }

    // Get user from store
    const user = users.get(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found.',
      });
      return;
    }

    // Generate new tokens
    const tokens = refreshAccessToken(refreshToken, user);
    if (!tokens) {
      res.status(401).json({
        success: false,
        error: 'Failed to refresh token.',
      });
      return;
    }

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.',
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const authReq = req as AuthenticatedRequest;
  const user = users.get(authReq.user.userId);

  if (!user) {
    res.status(404).json({
      success: false,
      error: 'User not found.',
    });
    return;
  }

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: userWithoutPassword,
  });
});

/**
 * PUT /auth/password
 * Change user password
 */
router.put('/password', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { currentPassword, newPassword } = req.body;

    // Validate new password
    const passwordValidation = AuthService.passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      res.status(400).json({
        success: false,
        error: 'New password does not meet requirements.',
        details: passwordValidation.error.errors,
      });
      return;
    }

    // Get user
    const user = users.get(authReq.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found.',
      });
      return;
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Current password is incorrect.',
      });
      return;
    }

    // Hash and save new password
    user.passwordHash = await hashPassword(newPassword);

    res.json({
      success: true,
      data: { message: 'Password updated successfully.' },
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.',
    });
  }
});

export { router as authRouter };
export default router;
