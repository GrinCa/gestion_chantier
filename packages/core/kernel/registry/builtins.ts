/**
 * builtins.ts
 * ---------------------------------------------------------------------------
 * Enregistrement des types de données de base (measurement, note).
 * Importer ce module a pour effet secondaire de remplir le registre global.
 */

import { globalDataTypeRegistry } from './DataTypeRegistry.js';
import { z } from 'zod';
import { migrateMeasurementV2 } from './migrations/measurement_v2.js';

// Type: measurement
// Représente une mesure numérique simple avec métadonnées optionnelles.
globalDataTypeRegistry.register({
  type: 'measurement',
  schemaVersion: 2,
  schema: z.object({
    value: z.number(),
    unit: z.string().optional(),
    label: z.string().optional(),
    meta: z.record(z.any()).optional()
  }),
  migrate(value: any, fromVersion: number) {
    return migrateMeasurementV2(value, fromVersion);
  },
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
  // Passons la version du schéma à 2 pour simuler une évolution (ajout 'category')
  schemaVersion: 2,
  schema: z.object({
    text: z.string().min(1),
    tags: z.array(z.string()).optional(),
    category: z.string().optional()
  }),
  migrate(value: any, fromVersion: number) {
    let v = { ...value };
    if (fromVersion < 2) {
      // Règle simple: si tag 'important' présent -> category = 'important'
      if (Array.isArray(v.tags) && v.tags.includes('important')) {
        v.category = 'important';
      }
    }
    return v;
  },
  indexStrategy(value: any) {
    return {
      text: value.text.slice(0, 200),
      tags: Array.isArray(value.tags) ? value.tags.join(',') : null,
      category: value.category || null
    };
  }
});

// Export symbolique (pas nécessaire mais clarifie disponibilité)
export const BUILTIN_DATA_TYPES = ['measurement', 'note'];