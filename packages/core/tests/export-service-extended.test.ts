import { describe, it, expect } from 'vitest';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import type { Resource } from '../kernel/domain/Resource.js';
import { ExportService } from '../kernel/services/ExportService.js';

function make(id: string, updatedAt: number, type='note'): Resource {
  return { id, type, workspaceId: 'w1', createdAt: updatedAt, updatedAt, version: 1, payload: { id } } as Resource;
}

describe('ExportService extended', () => {
  it('exportWorkspaceChunked découpe correctement', async () => {
    const repo = createInMemoryRepository();
    for (let i=0;i<7;i++) await repo.save(make('r'+i, Date.now()-i));
    const svc = new ExportService(repo as any);
    const { manifest, chunks } = await svc.exportWorkspaceChunked('w1', { chunkSize: 3 });
    expect(chunks.length).toBe(3); // 3+3+1
    expect(manifest.count).toBe(7);
    expect(chunks[0].ndjson.split('\n').length).toBe(3);
  });

  it('exportWorkspaceIncremental filtre par since', async () => {
    const repo = createInMemoryRepository();
    const base = Date.now();
    // plus ancien
    await repo.save(make('old', base - 10_000));
    await repo.save(make('mid', base - 1000));
    await repo.save(make('new', base));
    const svc = new ExportService(repo as any);
    const { manifest, ndjson, count } = await svc.exportWorkspaceIncremental('w1', base - 1500, { pageLimit: 2 });
    expect(count).toBe(2);
    const lines = ndjson.split('\n').filter(Boolean);
    expect(lines.length).toBe(2);
    expect(manifest.since).toBe(base - 1500);
  });
});
