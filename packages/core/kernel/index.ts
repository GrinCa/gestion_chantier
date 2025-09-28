/**
 * kernel/index.ts
 * ---------------------------------------------------------------------------
 * Point d'agrégation des exports du noyau expérimental.
 * Note: L'API ici est susceptible d'évolution contrôlée jusqu'à stabilisation.
 */

export * from './events/DomainEvent.js';
export * from './events/EventBus.js';
export * from './registry/DataTypeRegistry.js';
export * from './registry/builtins.js';
export * from './tools/ToolRegistry.js';
export * from './domain/Resource.js';
export * from './repository/ResourceRepository.js';
export * from './KernelContext.js';
export * from './bridge/DataEngineBridge.js';
export * from './services/ResourceService.js';
export * from './services/ToolExecutionService.js';
export * from './services/MigrationService.js';
export * from './services/MetricsService.js';
export * from './services/HealthService.js';
export * from './auth/AccessPolicy.js';
export * from './bootstrap/KernelBootstrap.js';
export * from './services/ExportService.js';
export * from './repository/SQLiteResourceRepository.js';
export * from './indexer/Indexer.js';
export * from './indexer/IndexSubscriber.js';
