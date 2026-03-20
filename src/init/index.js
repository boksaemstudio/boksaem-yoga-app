import { initContextMenuGuard, initAgentAdminMode } from './security';
import { initDatePolyfill } from './polyfill';
import { initServerWarmup } from './warmup';
import { initErrorHandlers } from './errorRecovery';
import { initBackgroundSync } from './sync';

export function runGlobalAppInitialization() {
  initContextMenuGuard();
  initDatePolyfill();
  initServerWarmup();
  initAgentAdminMode();
  initErrorHandlers();
  initBackgroundSync();
}
