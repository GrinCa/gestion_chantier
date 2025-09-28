/**
 * ExportService.ts
 * ---------------------------------------------------------------------------
 * Service d'export structuré (NDJSON) des resources d'un workspace.
 */
import type { ResourceRepository } from '../repository/ResourceRepository.js';
import type { AccessPolicy } from '../auth/AccessPolicy.js';
import { Readable } from 'stream';

export class ExportService {
  constructor(private repo: ResourceRepository, private policy?: AccessPolicy) {}

  async exportWorkspace(workspaceId: string): Promise<string> {
    const list = await this.repo.list(workspaceId, { limit: 100000 });
    return list.data.map(r=> JSON.stringify(r)).join('\n');
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