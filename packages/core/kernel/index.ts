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
