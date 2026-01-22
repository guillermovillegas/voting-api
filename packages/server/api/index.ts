/**
 * Vercel Serverless Entry Point
 *
 * Exports the Express app for Vercel's serverless functions.
 * Note: WebSocket functionality is not available in serverless mode.
 */

import { createApp } from '../src/app';

const app = createApp();

export default app;
