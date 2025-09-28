/**
 * Browser entry point (TD-001 skeleton)
 * Surface limitée: pas d'exports sqlite / modules Node.
 */
export * from './types/index.js';
export * from './data-engine/index.js';
export * from './tools-registry/index.js';
export * from './tools/calculatrice/index.js';
export * from './config/index.js';
export * from './kernel/events/DomainEvent.js';
export * from './kernel/events/EventBus.js';
export * from './kernel/registry/DataTypeRegistry.js';
export * from './kernel/registry/builtins.js';
export * from './kernel/tools/ToolRegistry.js';
export * from './kernel/domain/Resource.js';
export * from './kernel/repository/ResourceRepository.js';
export * from './kernel/KernelContext.js';
export * from './kernel/bridge/DataEngineBridge.js';
export * from './kernel/services/ResourceService.js';
export * from './kernel/services/ToolExecutionService.js';
export * from './kernel/services/MigrationService.js';
export * from './kernel/services/MetricsService.js';
export * from './kernel/services/HealthService.js';
export * from './kernel/auth/AccessPolicy.js';
export * from './kernel/bootstrap/KernelBootstrap.js';
export * from './kernel/services/ExportService.js';
export * from './kernel/indexer/Indexer.js';
export * from './kernel/indexer/IndexSubscriber.js';
// SQLite repository remplacé par stub explicite côté browser
export * from './kernel/repository/SQLiteResourceRepository.browser.js';

export { ensureBrowserEnvironment } from './runtime/env-guard.js';
export const RUNTIME_TARGET = 'browser';
