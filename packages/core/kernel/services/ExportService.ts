/**
 * ExportService.ts
 * ---------------------------------------------------------------------------
 * Service d'export structuré (NDJSON) des resources d'un workspace.
 */
import type { ResourceRepository } from '../repository/ResourceRepository.js';
import type { AccessPolicy } from '../auth/AccessPolicy.js';
import { Readable } from 'stream';

export class ExportService {
  private repo: ResourceRepository;
  private policy?: AccessPolicy;
  constructor(repo: ResourceRepository, policy?: AccessPolicy) {
    this.repo = repo;
    this.policy = policy;
  }

  async exportWorkspace(workspaceId: string): Promise<string> {
    const list = await this.repo.list(workspaceId, { limit: 100000 });
    return list.data.map(r=> JSON.stringify(r)).join('\n');
  }

  /**
   * Export avec manifest structuré (metadata + NDJSON).
   * Retourne un objet contenant le manifest et la charge NDJSON.
   * Manifest actuel minimal : { workspaceId, generatedAt, count, types }.
   * Peut être étendu plus tard (hash global, version, pagination tokens...).
   */
  async exportWorkspaceWithManifest(workspaceId: string) : Promise<{ manifest: any; ndjson: string }> {
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
    return { manifest, ndjson };
  }

  streamWorkspace(workspaceId: string): Readable {
    const stream = new Readable({ read(){} });
    this.repo.list(workspaceId, { limit: 100000 })
      .then(result => {
        for (const r of result.data) stream.push(JSON.stringify(r)+'\n');
        stream.push(null);
      })
      .catch(err => { stream.destroy(err); });
    return stream;
  }
}