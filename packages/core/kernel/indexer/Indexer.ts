/**
 * Indexer.ts
 * ---------------------------------------------------------------------------
 * Indexer naïf pour Resources. But: fournir une abstraction propre pour
 * l'indexation et la recherche textuelle simple avant une solution plus
 * avancée (SQLite FTS, Meilisearch, etc.).
 */
import type { Resource } from '../domain/Resource.js';

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
}

export interface Indexer {
  index(resource: Resource): Promise<void>;
  remove(id: string): Promise<void>;
  search(workspaceId: string, query: string, opts?: IndexSearchOptions): Promise<Resource[]>;
  size(): number;
}

export class InMemoryIndexer implements Indexer {
  private records = new Map<string, IndexedRecord>();
  private resourceGetter: (id: string) => Promise<Resource | null>;

  constructor(resourceGetter: (id: string) => Promise<Resource | null>) {
    this.resourceGetter = resourceGetter;
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
    const qTokens = this.normalize(query).split(/\s+/).filter(Boolean);
    const scores: Map<string, number> = new Map();
    for (const rec of this.records.values()) {
      if (rec.workspaceId !== workspaceId) continue;
      if (opts?.types && !opts.types.includes(rec.type)) continue;
      let score = 0;
      for (const token of qTokens) {
        const freq = rec.terms.get(token);
        if (freq) score += freq;
      }
      if (score > 0) scores.set(rec.id, score);
    }
    const sorted = [...scores.entries()].sort((a,b) => b[1]-a[1]);
    const limit = opts?.limit ?? 20;
    const results: Resource[] = [];
    for (const [id] of sorted.slice(0, limit)) {
      const r = await this.resourceGetter(id);
      if (r) results.push(r);
    }
    return results;
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
    return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ');
  }
}

export const createInMemoryIndexer = (getter: (id: string) => Promise<Resource | null>) => new InMemoryIndexer(getter);
