import { describe, it, expect } from 'vitest';
import { MigrationService } from '../kernel/services/MigrationService.js';
import { globalDataTypeRegistry } from '../kernel/registry/DataTypeRegistry.js';
import type { Resource } from '../kernel/domain/Resource.js';
import type { ResourceRepository } from '../kernel/repository/ResourceRepository.js';
import { ExportService } from '../kernel/services/ExportService.js';

class MemoryRepo implements ResourceRepository {
  private data: Resource[] = [];
  async save(r: Resource){ const i = this.data.findIndex(x=>x.id===r.id); if(i>=0) this.data[i] = { ...r }; else this.data.push({ ...r }); return r; }
  async get(id: string){ return this.data.find(r=>r.id===id) || null; }
  async delete(id: string){ this.data = this.data.filter(r=>r.id!==id); }
  async list(workspaceId: string, opts: any){
    const all = this.data.filter(r=>r.workspaceId===workspaceId).sort((a,b)=> b.updatedAt - a.updatedAt);
    const limit = opts?.limit ?? 100;
    const slice = all.slice(0, limit);
    return { data: slice, total: all.length, hasMore: all.length>limit } as any;
  }
  async query(workspaceId: string){ return { data: this.data.filter(r=>r.workspaceId===workspaceId), total: 0, hasMore: false } as any; }
}

describe('Integration: Export + Reindex (implicit) + Migration chain', () => {
  it('exports, upgrades schemaVersion, migrates, then incremental export returns only migrated', async () => {
    // Register type v1 first
    try { (globalDataTypeRegistry as any).types.delete('chain'); } catch {}
    globalDataTypeRegistry.register({ type: 'chain', schemaVersion: 1, validate: (p:any)=>p });

    const repo = new MemoryRepo();
    const exportSvc = new ExportService(repo as any);

    // seed 3 resources at schema v1
    for (let i=0;i<3;i++) {
      await repo.save({ id: 'c'+i, type: 'chain', workspaceId: 'w1', createdAt: Date.now()-1000, updatedAt: Date.now()-1000, version: 1, schemaVersion: 1, payload: { n:i } });
    }

    const fullBefore = await exportSvc.exportWorkspace('w1');
    expect(fullBefore.split('\n').length).toBe(3);

    // Upgrade type to v2 with migrate side effect
    try { (globalDataTypeRegistry as any).types.delete('chain'); } catch {}
    globalDataTypeRegistry.register({
      type: 'chain',
      schemaVersion: 2,
      validate: (p:any)=>p,
      migrate: (payload:any, from:number) => {
        if (from === 1) return { ...payload, upgraded: true };
        return payload;
      }
    });

    const migrationSvc = new MigrationService(repo as any);
    const res = await migrationSvc.migrateWorkspace('w1');
    expect(res.migrated).toBe(3);

    // incremental export since old timestamp must now include upgraded entries
    const sinceTs = Date.now()-500; // all upgraded have updatedAt ~ now
    const incr = await exportSvc.exportWorkspaceIncremental('w1', sinceTs);
    expect(incr.count).toBe(3);
    const lines = incr.ndjson.split('\n');
    expect(lines.every(l => JSON.parse(l).schemaVersion === 2)).toBe(true);
  });
});
