import { describe, it, expect } from 'vitest';
import { globalDataTypeRegistry } from '../kernel/registry/DataTypeRegistry.js';
import type { Resource } from '../kernel/domain/Resource.js';
import type { ResourceRepository } from '../kernel/repository/ResourceRepository.js';
import { InMemoryIndexer } from '../kernel/indexer/Indexer.js';

class MemoryRepo implements ResourceRepository {
  private data: Resource[] = [];
  async save(r: Resource){ const i = this.data.findIndex(x=>x.id===r.id); if(i>=0) this.data[i]={...r}; else this.data.push({...r}); return r; }
  async get(id: string){ return this.data.find(r=>r.id===id)||null; }
  async delete(id: string){ this.data = this.data.filter(r=>r.id!==id); }
  async list(workspaceId: string, opts: any){
    const all = this.data.filter(r=>r.workspaceId===workspaceId);
    return { data: all.slice(0, opts?.limit ?? 1000), total: all.length, hasMore: false } as any;
  }
  async query(workspaceId: string){ return { data: this.data.filter(r=>r.workspaceId===workspaceId), total: 0, hasMore: false } as any; }
}

describe('Indexer load under 1000 resources', () => {
  it('indexes and reports size within expected bounds', async () => {
    try { (globalDataTypeRegistry as any).types.delete('load'); } catch {}
    globalDataTypeRegistry.register({ type: 'load', schemaVersion: 1, validate: (p:any)=>p });

    const repo = new MemoryRepo();
  const idx = new InMemoryIndexer(async (id: string) => repo.get(id));

    const now = Date.now();
    for (let i=0;i<1000;i++) {
      await repo.save({ id: 'L'+i, type: 'load', workspaceId: 'wL', createdAt: now, updatedAt: now, version: 1, schemaVersion: 1, payload: { text: 'value '+i } });
  await idx.index({ id: 'L'+i, type: 'load', workspaceId: 'wL', createdAt: now, updatedAt: now, version: 1, schemaVersion: 1, payload: { text: 'value '+i } } as any);
    }

    expect(idx.size()).toBe(1000);
  const results = await idx.search('wL', 'value 42');
  expect(results.some(r => r.id === 'L42')).toBe(true);
  });
});
