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

// Version info
export const VERSION = '1.0.0';
export const CORE_NAME = '@gestion-chantier/core';