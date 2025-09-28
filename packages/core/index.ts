/**
 * CORE PACKAGE - Entry Point
 * ==========================
 * Universal data/tools architecture
 */

// Re-export all types
export * from './types/index.js';

// Re-export core engines
export * from './data-engine/index.js';
export * from './tools-registry/index.js';

// Re-export tools
export * from './tools/calculatrice/index.js';

// Re-export configuration
export * from './config/index.js';

// Kernel (expérimental – API sujette à évolution contrôlée)
// Fournit : EventBus, Resource, ToolRegistry, DataTypeRegistry.
// Usage : instrumentation / prototypage avant intégration profonde DataEngine.
export * from './kernel/index.js';

// Version info
export const VERSION = '1.0.0';
export const CORE_NAME = '@gestion-chantier/core';