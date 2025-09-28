/**
 * ExportService.ts
 * ---------------------------------------------------------------------------
 * Service d'export structuré (NDJSON) des resources d'un workspace.
 */
import type { ResourceRepository } from '../repository/ResourceRepository.js';
import type { AccessPolicy } from '../auth/AccessPolicy.js';
import type { MetricsService } from './MetricsService.js';
// Lazy import pour compat browser: évite que le bundler web tente de résoudre 'stream'.
type ReadableLike = any; // minimal typing pour surface publique
let _Readable: any;
function getReadable(): ReadableLike {
  if (!_Readable) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _Readable = require('stream').Readable; // CJS interop safe
    } catch {
      throw new Error('[core] stream module non disponible dans cet environnement');
    }
  }
  return _Readable;
}

export class ExportService {
  constructor(private repo: ResourceRepository, private policy?: AccessPolicy, private metrics?: MetricsService) {}

  async exportWorkspace(workspaceId: string): Promise<string> {
    const start = Date.now();
    const list = await this.repo.list(workspaceId, { limit: 100000 });
    const out = list.data.map(r=> JSON.stringify(r)).join('\n');
    this.metrics?.recordExport('full', list.data.length, Date.now()-start);
    return out;
  }

  /**
   * Export avec manifest structuré (metadata + NDJSON).
   * Retourne un objet contenant le manifest et la charge NDJSON.
   * Manifest actuel minimal : { workspaceId, generatedAt, count, types }.
   * Peut être étendu plus tard (hash global, version, pagination tokens...).
   */
  async exportWorkspaceWithManifest(workspaceId: string) : Promise<{ manifest: any; ndjson: string }> {
    const start = Date.now();
    const list = await this.repo.list(workspaceId, { limit: 100000 });
    const ndjson = list.data.map(r=> JSON.stringify(r)).join('\n');
    const typeCounts: Record<string, number> = {};
    for (const r of list.data) typeCounts[r.type] = (typeCounts[r.type]||0)+1;
    const manifest = {
      workspaceId,
      generatedAt: Date.now(),
      count: list.data.length,
      types: typeCounts,
      format: 'resource-ndjson',
      version: 1
    };
    this.metrics?.recordExport('withManifest', list.data.length, Date.now()-start);
    return { manifest, ndjson };
  }

  streamWorkspace(workspaceId: string): ReadableLike {
    const Readable = getReadable();
    const stream = new Readable({ read(){} });
    this.repo.list(workspaceId, { limit: 100000 })
      .then(result => {
        for (const r of result.data) stream.push(JSON.stringify(r)+'\n');
        stream.push(null);
      })
      .catch(err => { stream.destroy(err); });
    return stream;
  }

  /**
   * Export chunké: découpe les resources en blocs de `chunkSize` (default 10k) et
   * retourne un tableau d'objets { index, count, ndjson } + manifest enrichi.
   * Utile pour très grands volumes sans charger tout en mémoire côté consommateur.
   */
  async exportWorkspaceChunked(workspaceId: string, opts?: { chunkSize?: number; limit?: number }): Promise<{ manifest: any; chunks: Array<{ index: number; count: number; ndjson: string }> }> {
    const start = Date.now();
    const chunkSize = opts?.chunkSize && opts.chunkSize > 0 ? opts.chunkSize : 10000;
    const limit = opts?.limit ?? 250000; // garde-fou
    const all = await this.repo.list(workspaceId, { limit });
    const chunks: Array<{ index: number; count: number; ndjson: string }> = [];
    for (let i=0;i<all.data.length;i+=chunkSize) {
      const slice = all.data.slice(i, i+chunkSize);
      chunks.push({ index: chunks.length, count: slice.length, ndjson: slice.map(r=> JSON.stringify(r)).join('\n') });
    }
    const typeCounts: Record<string, number> = {};
    for (const r of all.data) typeCounts[r.type] = (typeCounts[r.type]||0)+1;
    const manifest = {
      workspaceId,
      generatedAt: Date.now(),
      count: all.data.length,
      chunkSize,
      chunks: chunks.length,
      types: typeCounts,
      format: 'resource-ndjson-chunked',
      version: 1
    };
    this.metrics?.recordExport('chunked', all.data.length, Date.now()-start);
    return { manifest, chunks };
  }

  /**
   * Export incrémental: retourne uniquement les resources avec updatedAt >= since.
   * On applique pagination interne multi-page via nextCursor jusqu'à épuisement.
   */
  async exportWorkspaceIncremental(workspaceId: string, since: number, opts?: { pageLimit?: number }): Promise<{ manifest: any; ndjson: string; count: number }> {
    const start = Date.now();
    const pageLimit = opts?.pageLimit ?? 5000;
    let cursor: string | undefined;
    const collected: any[] = [];
    for(;;) {
      const page = await this.repo.list(workspaceId, { limit: pageLimit, cursor });
      const filtered = page.data.filter(r => r.updatedAt >= since);
      collected.push(...filtered);
      if (!page.nextCursor) break;
      // optimisation: si la page contient déjà un updatedAt < since et tri DESC, on peut arrêter
      if (page.data.length && page.data[page.data.length-1].updatedAt < since) break;
      cursor = page.nextCursor || undefined;
    }
    const ndjson = collected.map(r=> JSON.stringify(r)).join('\n');
    const manifest = {
      workspaceId,
      generatedAt: Date.now(),
      since,
      count: collected.length,
      format: 'resource-ndjson-incremental',
      version: 1
    };
    this.metrics?.recordExport('incremental', collected.length, Date.now()-start);
    return { manifest, ndjson, count: collected.length };
  }
}