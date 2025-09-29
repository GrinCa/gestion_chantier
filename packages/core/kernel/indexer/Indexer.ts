/**
 * Indexer.ts
 * ---------------------------------------------------------------------------
 * Indexer naïf pour Resources. But: fournir une abstraction propre pour
 * l'indexation et la recherche textuelle simple avant une solution plus
 * avancée (SQLite FTS, Meilisearch, etc.).
 * 
 * Version 2: Support des opérateurs OR, recherche de phrases et highlight.
 */
import type { Resource } from '../domain/Resource.js';
import { QueryParser, type ParsedQuery, type HighlightMatch } from './QueryParser.js';

export interface IndexedRecord {
  id: string;
  workspaceId: string;
  type: string;
  terms: Map<string, number>; // terme -> fréquence
  updatedAt: number;
}

export interface IndexSearchOptions {
  limit?: number;
  types?: string[];
  enableHighlight?: boolean; // active le calcul des positions pour highlight
}

export interface IndexSearchResult {
  resources: Resource[];
  scores?: Record<string, number>;
  highlights?: Record<string, HighlightMatch[]>;
}

export interface Indexer {
  index(resource: Resource): Promise<void>;
  remove(id: string): Promise<void>;
  search(workspaceId: string, query: string, opts?: IndexSearchOptions): Promise<Resource[]>;
  searchAdvanced(workspaceId: string, query: string, opts?: IndexSearchOptions): Promise<IndexSearchResult>;
  size(): number;
}

export class InMemoryIndexer implements Indexer {
  private records = new Map<string, IndexedRecord>();
  private resourceGetter: (id: string) => Promise<Resource | null>;
  private queryParser: QueryParser;

  constructor(resourceGetter: (id: string) => Promise<Resource | null>) {
    this.resourceGetter = resourceGetter;
    this.queryParser = new QueryParser();
  }

  async index(resource: Resource): Promise<void> {
    const terms = this.tokenize(resource);
    this.records.set(resource.id, {
      id: resource.id,
      workspaceId: resource.workspaceId,
      type: resource.type,
      terms,
      updatedAt: resource.updatedAt
    });
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }

  async search(workspaceId: string, query: string, opts?: IndexSearchOptions): Promise<Resource[]> {
    const result = await this.searchAdvanced(workspaceId, query, opts);
    return result.resources;
  }

  async searchAdvanced(workspaceId: string, query: string, opts?: IndexSearchOptions): Promise<IndexSearchResult> {
    const parsedQuery = this.queryParser.parse(query, opts?.enableHighlight);
    const scores: Map<string, number> = new Map();
    const highlights: Record<string, HighlightMatch[]> = {};
    
    for (const rec of this.records.values()) {
      if (rec.workspaceId !== workspaceId) continue;
      if (opts?.types && !opts.types.includes(rec.type)) continue;
      
      // Construire le contenu searchable pour cette resource
      const resource = await this.resourceGetter(rec.id);
      if (!resource) continue;
      
      const content = this.buildSearchableContent(resource);
      const evaluation = this.queryParser.evaluate(parsedQuery, content);
      
      if (evaluation.matches && evaluation.score > 0) {
        scores.set(rec.id, evaluation.score);
        if (opts?.enableHighlight && evaluation.highlights) {
          highlights[rec.id] = evaluation.highlights;
        }
      }
    }
    
    const sorted = [...scores.entries()].sort((a,b) => b[1]-a[1]);
    const limit = opts?.limit ?? 20;
    const results: Resource[] = [];
    
    for (const [id] of sorted.slice(0, limit)) {
      const r = await this.resourceGetter(id);
      if (r) results.push(r);
    }
    
    const finalScores = Object.fromEntries(scores);
    
    return {
      resources: results,
      scores: Object.keys(finalScores).length > 0 ? finalScores : undefined,
      highlights: opts?.enableHighlight && Object.keys(highlights).length > 0 ? highlights : undefined
    };
  }

  size(): number { return this.records.size; }

  // --- helpers ---
  private tokenize(resource: Resource): Map<string, number> {
    const acc = new Map<string, number>();
    const push = (text: string) => {
      const norm = this.normalize(text);
      for (const t of norm.split(/\s+/)) {
        if (!t) continue;
        acc.set(t, (acc.get(t) ?? 0) + 1);
      }
    };
    // Parcours simple: payload et metadata
    const dive = (v: any) => {
      if (v == null) return;
      if (typeof v === 'string') push(v);
      else if (Array.isArray(v)) v.forEach(dive);
      else if (typeof v === 'object') Object.values(v).forEach(dive);
      else if (typeof v === 'number') push(String(v));
    };
    dive(resource.payload);
    dive(resource.metadata);
    return acc;
  }

  private normalize(s: string): string {
    return s.toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // supprimer les accents (diacritiques)
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildSearchableContent(resource: Resource): string {
    const parts: string[] = [];
    
    // Inclure le type
    parts.push(resource.type);
    
    // Parcourir le payload et metadata de manière récursive
    const extractStrings = (obj: any): void => {
      if (obj == null) return;
      if (typeof obj === 'string') {
        parts.push(obj);
      } else if (typeof obj === 'number') {
        parts.push(String(obj));
      } else if (Array.isArray(obj)) {
        obj.forEach(extractStrings);
      } else if (typeof obj === 'object') {
        Object.values(obj).forEach(extractStrings);
      }
    };
    
    extractStrings(resource.payload);
    extractStrings(resource.metadata);
    
    return parts.join(' ');
  }
}

export const createInMemoryIndexer = (getter: (id: string) => Promise<Resource | null>) => new InMemoryIndexer(getter);
