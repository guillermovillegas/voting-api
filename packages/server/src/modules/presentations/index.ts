/**
 * Presentations Module Exports
 *
 * OWNERSHIP: AGENT_PRESENT
 */

export * from './presentations.service';
export * from './presentations.routes';
export * from './timer.service';
export * from './timer.routes';
export { presentationsRoutes } from './presentations.routes';
export { timerRoutes } from './timer.routes';
export { registerPresentationSocketHandlers } from './presentations.socket';
export { registerTimerSocketHandlers } from './timer.socket';
