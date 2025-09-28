import { describe, it, expect } from 'vitest';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import type { Resource } from '../kernel/domain/Resource.js';
import { ExportService } from '../kernel/services/ExportService.js';

function make(id: string, updatedAt: number, ws='wL'): Resource {
  return { id, type: 't', workspaceId: ws, createdAt: updatedAt, updatedAt, version: 1, payload: { id } } as Resource;
}

describe('ExportService limits', () => {
  it('rejects full export beyond maxResources', async () => {
    const repo = createInMemoryRepository();
    for (let i=0;i<6;i++) await repo.save(make('r'+i, Date.now()-i));
    const svc = new ExportService(repo as any, undefined, undefined, { maxResources: 5 });
    await expect(svc.exportWorkspace('wL')).rejects.toThrow(/resource limit exceeded/);
  });

  it('allows export under limit', async () => {
    const repo = createInMemoryRepository();
    for (let i=0;i<5;i++) await repo.save(make('r'+i, Date.now()-i));
    const svc = new ExportService(repo as any, undefined, undefined, { maxResources: 5 });
    const out = await svc.exportWorkspace('wL');
    expect(out.split('\n').filter(Boolean).length).toBe(5);
  });

  it('rejects incremental mid-stream when exceeding limit', async () => {
    const repo = createInMemoryRepository();
    const base = Date.now();
    for (let i=0;i<10;i++) await repo.save(make('r'+i, base - i));
    const svc = new ExportService(repo as any, undefined, undefined, { maxResources: 3 });
    await expect(svc.exportWorkspaceIncremental('wL', base - 10000, { pageLimit: 2 })).rejects.toThrow(/resource limit exceeded/);
  });

  it('rejects full export exceeding maxBytes', async () => {
    const repo = createInMemoryRepository();
    // Construire des payloads volumineux pour dépasser 500 octets
    for (let i=0;i<20;i++) await repo.save({ id: 'b'+i, type: 'blob', workspaceId: 'wL', createdAt: Date.now(), updatedAt: Date.now(), version: 1, payload: { big: 'x'.repeat(80) } } as any);
    const svc = new ExportService(repo as any, undefined, undefined, { maxBytes: 500 });
    await expect(svc.exportWorkspace('wL')).rejects.toThrow(/byte size limit exceeded/);
  });
});
