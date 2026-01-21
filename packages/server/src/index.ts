/**
 * Server Entry Point
 *
 * OWNERSHIP: PROTECTED (AGENT_INFRA)
 * Changes require user approval
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env['CLIENT_URL'] ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// ROUTE REGISTRATION
// Each module registers its routes here
// Format: // [AGENT_<ID>] <module> routes
// ============================================================================

// [AGENT_AUTH] Auth routes will be registered here
// [AGENT_TEAMS] Team routes will be registered here
// [AGENT_VOTING] Voting routes will be registered here
// [AGENT_PRESENT] Presentation routes will be registered here
// [AGENT_LEADER] Leaderboard routes will be registered here
// [AGENT_ADMIN] Admin routes will be registered here

// ============================================================================
// SOCKET HANDLERS
// Each module registers its socket handlers here
// ============================================================================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // [AGENT_LEADER] Leaderboard events
  // [AGENT_PRESENT] Timer events
  // [AGENT_VOTING] Vote events

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env['PORT'] ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, io };
