/* eslint-env node */
/**
 * Express App Factory
 *
 * Builds the API app without starting the HTTP server.
 * This allows tests and tools to reuse the app without DB init.
 */

import express from 'express';
import cors from 'cors';

import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  responseFormatter,
  securityHeaders,
  sanitizeBody,
} from './core/api';
import { versionMiddleware } from './core/api/versioning';
import { setupSwagger } from './core/api/swagger';

import authRoutes from './modules/auth/auth.routes';
import teamsRoutes from './modules/teams/teams.routes';
import votingRoutes from './modules/voting/voting.routes';
import { presentationsRoutes, timerRoutes } from './modules/presentations';
import { leaderboardRoutes } from './modules/leaderboard';
import { adminRoutes } from './modules/admin';

export function createApp() {
  const app = express();

  // Security headers
  app.use(securityHeaders);

  // CORS
  app.use(cors());

  // Request logging
  app.use(requestLogger);

  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input sanitization
  app.use(sanitizeBody);

  // API versioning
  app.use(versionMiddleware);

  // Response formatting
  app.use(responseFormatter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API documentation
  setupSwagger(app);

  // Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/teams', teamsRoutes);
  app.use('/api/v1/votes', votingRoutes);
  app.use('/api/v1/presentations', presentationsRoutes);
  app.use('/api/v1/timer', timerRoutes);
  app.use('/api/v1/leaderboard', leaderboardRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

export default createApp;
