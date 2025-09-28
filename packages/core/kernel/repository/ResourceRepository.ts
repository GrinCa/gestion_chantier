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

import { Resource } from '../domain/Resource.js';

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
  /** Cursor basé sur ordre par défaut (updatedAt DESC, id DESC) sous forme `${updatedAt}:${id}` */
  cursor?: string;
}

export interface ResourceListResult {
  data: Resource[];
  total: number;
  // Optionnel: score simple pour recherche fullText (si applicable)
  scores?: Record<string, number>;
  /** Cursor pour la page suivante (même format que QueryOptions.cursor) */
  nextCursor?: string | null;
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

    let scores: Record<string, number> | undefined;
    if (query?.fullText) {
      const qRaw = query.fullText.trim().toLowerCase();
      const tokens = qRaw.split(/\s+/).filter(t=> t.length);
      scores = {};
      const matches = new Set<string>();
      for (const entry of this.index.values()) {
        if (entry.workspaceId !== workspaceId) continue;
        let score = 0;
        for (const t of tokens) {
          const occ = entry.text.split(t).length - 1;
            if (occ > 0) score += occ;
        }
        if (score > 0) {
          scores[entry.id] = score;
          matches.add(entry.id);
        }
      }
      items = items.filter(r => matches.has(r.id));
      // Tri secondaire par score si non spécifié
      if (!query.sort) {
        items.sort((a,b)=> (scores![b.id]||0) - (scores![a.id]||0));
      }
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
    } else if (!scores) { // ne pas écraser le tri par score déjà appliqué
      // Ordre stable par défaut pour pagination cursor
      items.sort((a,b)=>{
        if (a.updatedAt === b.updatedAt) return a.id < b.id ? 1 : -1; // id DESC si timestamp égal
        return a.updatedAt > b.updatedAt ? -1 : 1; // updatedAt DESC
      });
    }

    // Cursor application (après tri)
    if (query?.cursor) {
      const [tsStr, idCur] = query.cursor.split(':');
      const ts = parseInt(tsStr, 10);
      items = items.filter(r => (r.updatedAt < ts) || (r.updatedAt === ts && r.id < idCur));
    }

    const total = items.length;
    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? 50;
    const page = items.slice(offset, offset + limit + 1); // fetch one extra to detect next
    let nextCursor: string | null = null;
    if (page.length > limit) {
      const last = page[limit - 1];
      nextCursor = `${last.updatedAt}:${last.id}`;
    }
    const data = page.slice(0, limit);
    return { data, total, scores, nextCursor };
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
