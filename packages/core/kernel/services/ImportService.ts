/**
 * ImportService.ts
 * ---------------------------------------------------------------------------
 * Validation basique d'un export (manifest + NDJSON ou chunks) avant futur
 * import réel. Vérifie :
 *  - Count total
 *  - Distribution des types
 *  - Unicité des IDs
 *  - Format JSON ligne par ligne
 */

interface ValidationIssue {
  code: string;
  message: string;
  details?: any;
}

export interface ImportValidationResult {
  success: boolean;
  issues: ValidationIssue[];
  stats: {
    count: number;
    types: Record<string, number>;
    duplicateIds: number;
  };
}

import type { MetricsService } from './MetricsService.js';

export class ImportService {
  constructor(private metrics?: MetricsService){}
  validateNdjson(manifest: any, ndjson: string): ImportValidationResult {
    const start = Date.now();
    const lines = ndjson.split(/\n+/).filter(l => l.trim().length > 0);
    const issues: ValidationIssue[] = [];
    const types: Record<string, number> = {};
    const ids = new Set<string>();
    let duplicateIds = 0;

    for (let i=0;i<lines.length;i++) {
      const raw = lines[i];
      try {
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== 'object') {
          issues.push({ code: 'INVALID_OBJECT', message: `Ligne ${i+1}: objet non valide` });
          continue;
        }
        if (!obj.id) issues.push({ code: 'MISSING_ID', message: `Ligne ${i+1}: id manquant` });
        else if (ids.has(obj.id)) { duplicateIds++; }
        else ids.add(obj.id);
        if (obj.type) types[obj.type] = (types[obj.type]||0)+1; else issues.push({ code: 'MISSING_TYPE', message: `Ligne ${i+1}: type manquant` });
      } catch (e:any) {
        issues.push({ code: 'JSON_PARSE', message: `Ligne ${i+1}: JSON invalide`, details: e.message });
      }
    }

    // Vérifs manifest (si informations présentes)
    if (manifest?.count != null && manifest.count !== lines.length) {
      issues.push({ code: 'COUNT_MISMATCH', message: `Count manifest=${manifest.count} réel=${lines.length}` });
    }
    if (manifest?.types) {
      for (const t of Object.keys(types)) {
        const expected = manifest.types[t];
        if (expected == null) {
          issues.push({ code: 'UNDECLARED_TYPE', message: `Type ${t} absent du manifest`, details: { found: types[t] } });
        } else if (expected !== types[t]) {
          issues.push({ code: 'TYPE_COUNT_MISMATCH', message: `Type ${t}: manifest=${expected} réel=${types[t]}` });
        }
      }
      for (const mt of Object.keys(manifest.types)) {
        if (!types[mt]) {
          issues.push({ code: 'MISSING_TYPE_IN_DATA', message: `Type ${mt} attendu mais absent des données` });
        }
      }
    }
    if (duplicateIds > 0) {
      issues.push({ code: 'DUPLICATE_ID', message: `IDs dupliqués: ${duplicateIds}` });
    }

    const result: ImportValidationResult = {
      success: issues.length === 0,
      issues,
      stats: { count: lines.length, types, duplicateIds }
    };
    this.metrics?.recordImport(lines.length, Date.now()-start, issues.length);
    return result;
  }

  validateChunked(manifest: any, chunks: Array<{ ndjson: string }>): ImportValidationResult {
    const combined = chunks.map(c => c.ndjson).join('\n');
    return this.validateNdjson(manifest, combined);
  }
}

export const createImportService = (metrics?: MetricsService) => new ImportService(metrics);
