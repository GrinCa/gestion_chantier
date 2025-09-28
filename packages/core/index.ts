/**
 * CORE PACKAGE - Legacy Aggregated Entry Point
 * ============================================
 * Conservé pour compat interne. Ne pas utiliser directement côté application.
 * Utiliser:
 *   import { ... } from '@gestion-chantier/core/browser'
 *   import { ... } from '@gestion-chantier/core/node'
 * (Voir TD-001 Node vs Browser surface split)
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

// Transitional workspace key compatibility layer (Section 8)
export * from './compat/WorkspaceKeyCompat.js';

// Version info
export const VERSION = '1.0.0';
export const CORE_NAME = '@gestion-chantier/core';