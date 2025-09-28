/**
 * ResourceRepository.ts
 * ---------------------------------------------------------------------------
 * Couche d'accès aux Resources (lecture / écriture / requête) détachée de la
 * DataEngine existante. Permet une migration progressive : la DataEngine
 * pourra consommer ce repository au lieu de manipuler directement le storage.
 *
 * Implémentation initiale : InMemoryResourceRepository
 * - Stockage brut en Map
 * - Requêtage naïf (filtrage en mémoire)
 * - Index secondaire minimal (champ textuel concaténé) pour préparer la suite
 *
 * Évolutions prévues :
 * - Adaptateur persistant (SQLite / IndexedDB)
 * - Indexer externe plugable (full-text, facettes)
 * - Pagination performante (curseurs)
 */

import type { Resource } from '../domain/Resource.js';

export type FieldOp = 'eq' | 'in' | 'lt' | 'gt' | 'contains';

export interface QueryFilter {
  field: string;
  op: FieldOp;
  value: any;
}

export interface QuerySort {
  field: string;
  dir: 'asc' | 'desc';
}

export interface QueryOptions {
  filter?: QueryFilter[];
  sort?: QuerySort[];
  limit?: number;
  offset?: number;
  fullText?: string;
  types?: string[];
}

export interface ResourceListResult {
  data: Resource[];
  total: number;
}

export interface ResourceRepository {
  get(id: string): Promise<Resource | null>;
  list(workspaceId: string, query?: QueryOptions): Promise<ResourceListResult>;
  save(resource: Resource): Promise<Resource>;
  delete(id: string): Promise<void>;
  /** Hook d'indexation (appellé automatiquement dans save/delete) */
  reindex?(resource: Resource): Promise<void>;
}

interface InternalIndexEntry {
  id: string;
  workspaceId: string;
  type: string;
  text: string; // concat simpliste
  updatedAt: number;
}

export class InMemoryResourceRepository implements ResourceRepository {
  private store = new Map<string, Resource>();
  private index = new Map<string, InternalIndexEntry>();

  async get(id: string): Promise<Resource | null> {
    return this.store.get(id) ?? null;
  }

  async list(workspaceId: string, query?: QueryOptions): Promise<ResourceListResult> {
    let items = [...this.store.values()].filter(r => r.workspaceId === workspaceId);

    if (query?.types) {
      items = items.filter(r => query.types!.includes(r.type));
    }

    if (query?.filter) {
      items = items.filter(r => this.applyFilters(r, query.filter!));
    }

    if (query?.fullText) {
      const q = query.fullText.toLowerCase();
      const ids = [...this.index.values()]
        .filter(e => e.workspaceId === workspaceId && e.text.includes(q))
        .map(e => e.id);
      const set = new Set(ids);
      items = items.filter(r => set.has(r.id));
    }

    if (query?.sort) {
      items.sort((a, b) => {
        for (const s of query.sort!) {
          const av = this.getField(a, s.field);
            const bv = this.getField(b, s.field);
            if (av === bv) continue;
            const cmp = av < bv ? -1 : 1;
            return s.dir === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }

    const total = items.length;
    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? 50;
    const data = items.slice(offset, offset + limit);
    return { data, total };
  }

  async save(resource: Resource): Promise<Resource> {
    this.store.set(resource.id, resource);
    await this.reindex(resource);
    return resource;
  }

  async delete(id: string): Promise<void> {
    const res = this.store.get(id);
    if (res) {
      this.store.delete(id);
      this.index.delete(id);
    }
  }

  async reindex(resource: Resource): Promise<void> {
    // Index textuel naïf : concat champs string du payload + metadata
    const parts: string[] = [];
    const pushValue = (v: any) => {
      if (v == null) return;
      if (typeof v === 'string') parts.push(v.toLowerCase());
      else if (Array.isArray(v)) v.forEach(pushValue);
      else if (typeof v === 'object') Object.values(v).forEach(pushValue);
      else if (typeof v === 'number') parts.push(String(v));
    };
    pushValue(resource.payload);
    pushValue(resource.metadata);

    this.index.set(resource.id, {
      id: resource.id,
      workspaceId: resource.workspaceId,
      type: resource.type,
      text: parts.join(' '),
      updatedAt: resource.updatedAt
    });
  }

  // --- Helpers ---
  private applyFilters(r: Resource, filters: QueryFilter[]): boolean {
    for (const f of filters) {
      const val = this.getField(r, f.field);
      switch (f.op) {
        case 'eq': if (val !== f.value) return false; break;
        case 'in': if (!Array.isArray(f.value) || !f.value.includes(val)) return false; break;
        case 'lt': if (!(val < f.value)) return false; break;
        case 'gt': if (!(val > f.value)) return false; break;
        case 'contains': if (typeof val !== 'string' || !val.toLowerCase().includes(String(f.value).toLowerCase())) return false; break;
        default: return false;
      }
    }
    return true;
  }

  private getField(r: Resource, path: string): any {
    if (path === 'id') return r.id;
    if (path === 'type') return r.type;
    if (path === 'createdAt') return r.createdAt;
    if (path === 'updatedAt') return r.updatedAt;
    const segments = path.split('.');
    let cur: any = r as any;
    for (const s of segments) {
      if (cur == null) return undefined;
      cur = cur[s];
    }
    return cur;
  }
}

export const createInMemoryRepository = () => new InMemoryResourceRepository();
