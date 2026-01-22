/* eslint-env node */
/**
 * Lightweight server for curl/manual testing.
 * Starts the app without DB initialization.
 */

import { createServer } from 'http';
import { createApp } from './app';

const PORT = Number(process.env['PORT'] ?? 5055);
const app = createApp();
const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

function shutdown() {
  httpServer.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
