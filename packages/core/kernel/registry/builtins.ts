/**
 * builtins.ts
 * ---------------------------------------------------------------------------
 * Enregistrement des types de données de base (measurement, note).
 * Importer ce module a pour effet secondaire de remplir le registre global.
 */

import { globalDataTypeRegistry } from './DataTypeRegistry.js';
import { z } from 'zod';

// Type: measurement
// Représente une mesure numérique simple avec métadonnées optionnelles.
globalDataTypeRegistry.register({
  type: 'measurement',
  schemaVersion: 1,
  schema: z.object({
    value: z.number(),
    unit: z.string().optional(),
    label: z.string().optional(),
    meta: z.record(z.any()).optional()
  }),
  indexStrategy(value: any) {
    return {
      value: value.value,
      unit: value.unit || null,
      label: value.label || null
    };
  }
});

// Type: note
// Note textuelle courte, tags optionnels.
globalDataTypeRegistry.register({
  type: 'note',
  schemaVersion: 1,
  schema: z.object({
    text: z.string().min(1),
    tags: z.array(z.string()).optional()
  }),
  indexStrategy(value: any) {
    return {
      text: value.text.slice(0, 200),
      tags: Array.isArray(value.tags) ? value.tags.join(',') : null
    };
  }
});

// Export symbolique (pas nécessaire mais clarifie disponibilité)
export const BUILTIN_DATA_TYPES = ['measurement', 'note'];