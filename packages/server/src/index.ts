/* eslint-env node */
/**
 * Server Entry Point
 *
 * OWNERSHIP: PROTECTED (AGENT_INFRA)
 * Changes require user approval
 */

import { createServer } from 'http';
import { Server } from 'socket.io';

// [AGENT_INFRA] Database setup
import { testConnection } from './core/db/pool';
import { runMigrations } from './core/migrations';

import { createApp } from './app';

// [AGENT_LEADER] Leaderboard routes
import { registerLeaderboardSocketHandlers } from './modules/leaderboard';

// [AGENT_PRESENT] Presentation socket handlers
import {
  registerPresentationSocketHandlers,
  registerTimerSocketHandlers,
} from './modules/presentations';

// [AGENT_INFRA] Socket broadcaster
import { initBroadcaster } from './core/socket';

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env['CLIENT_URL'] ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Initialize socket broadcaster for use in API routes
initBroadcaster(io);

// ============================================================================
// SOCKET HANDLERS
// ============================================================================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // [AGENT_LEADER] Leaderboard events
  registerLeaderboardSocketHandlers(io, socket);

  // [AGENT_PRESENT] Presentation events
  registerPresentationSocketHandlers(io, socket);

  // [AGENT_PRESENT] Timer events
  registerTimerSocketHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to database. Exiting.');
      process.exit(1);
    }

    // Run pending migrations
    console.log('Running database migrations...');
    await runMigrations();

    // Start server
    const PORT = process.env['PORT'] ?? 3000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, io };
