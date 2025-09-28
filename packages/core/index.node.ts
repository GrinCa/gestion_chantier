/**
 * Node entry point (TD-001 skeleton)
 * Exporte toute la surface complète y compris modules dépendants de Node (sqlite, fs, etc.)
 */
export * from './index.js'; // ré-export legacy (pour compat interne progressive)
export * from './kernel/repository/SQLiteResourceRepository.js';
export { ensureNodeEnvironment } from './runtime/env-guard.js';

export const RUNTIME_TARGET = 'node';
