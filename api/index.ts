/**
 * Vercel Serverless Entry Point
 *
 * Exports the Express app for Vercel's serverless functions.
 * Note: WebSocket functionality is not available in serverless mode.
 */

// @ts-nocheck
import { createApp } from '../packages/server/dist/app.js';

const app = createApp();

export default app;
