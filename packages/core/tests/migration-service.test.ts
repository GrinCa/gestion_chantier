import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationService } from '../kernel/services/MigrationService.js';
import { globalDataTypeRegistry } from '../kernel/registry/DataTypeRegistry.js';
import type { Resource } from '../kernel/domain/Resource.js';
import type { ResourceRepository } from '../kernel/repository/ResourceRepository.js';
import type { MetricsService } from '../kernel/services/MetricsService.js';

class MemoryRepo implements ResourceRepository {
  private resources: Resource[] = [];
  async save(res: Resource) { const idx = this.resources.findIndex(r => r.id === res.id); if (idx>=0) this.resources[idx] = { ...res }; else this.resources.push({ ...res }); return res; }
  async get(id: string) { return this.resources.find(r => r.id === id) || null; }
  async delete(id: string) { this.resources = this.resources.filter(r => r.id !== id); }
  async list(workspaceId: string, opts: any) { const data = this.resources.filter(r => r.workspaceId === workspaceId); return { data: data.slice(0, opts?.limit ?? 1000), total: data.length, hasMore: false }; }
  async query(workspaceId: string, _filters: any) { const data = this.resources.filter(r => r.workspaceId === workspaceId); return { data, total: data.length, hasMore: false }; }
}

function createMockMetrics(){
  const migrations: Array<{ count: number; duration: number }> = [];
  return {
    migrations,
    recordMigration(count: number, duration: number){ migrations.push({ count, duration }); },
    snapshot(){
      return {
        timestamp: Date.now(),
        events: {},
        toolExec: { count: 0, avgDurationMs: 0, p95DurationMs: 0 },
        migration: migrations.length ? { total: migrations.length, resourcesTouched: migrations.at(-1)!.count, lastDurationMs: migrations.at(-1)!.duration } : undefined
      } as any;
    }
  } as MetricsService & { migrations: typeof migrations };
}

describe('MigrationService', () => {
  beforeEach(() => {
    // reset registry entry for test type
    try { (globalDataTypeRegistry as any).types.delete('demo'); } catch {}
    globalDataTypeRegistry.register({
      type: 'demo',
      schemaVersion: 2,
      validate: (p: any) => p,
      migrate: (payload: any, fromVersion: number) => {
        // simple migration increments a field
        const base = { ...payload };
        if (fromVersion === 1) base.migrated = (base.migrated || 0) + 1;
        return base;
      }
    });
  });

  it('migre les resources outdated et met à jour schemaVersion', async () => {
    const repo = new MemoryRepo();
  const metrics = createMockMetrics();
    const service = new MigrationService(repo as any, metrics as any);

    // seed two resources at v1 and one already at v2
    const r1: Resource = { id: 'r1', type: 'demo', workspaceId: 'w1', createdAt: Date.now(), updatedAt: Date.now(), version: 1, schemaVersion: 1, payload: { value: 10 } };
    const r2: Resource = { ...r1, id: 'r2' };
    const r3: Resource = { ...r1, id: 'r3', schemaVersion: 2 };
    await repo.save(r1); await repo.save(r2); await repo.save(r3);

    const pendingBefore = await service.pendingMigrations('w1');
    expect(pendingBefore.total).toBe(2);

    const result = await service.migrateWorkspace('w1');
    expect(result.migrated).toBe(2);
    expect(result.touchedIds.sort()).toEqual(['r1','r2']);

    const after = await service.pendingMigrations('w1');
    expect(after.total).toBe(0);

    // confirm payload migrated
    const updated = await repo.get('r1');
    expect(updated?.payload.migrated).toBe(1);

    // metrics recorded
  expect(metrics.migrations.length).toBe(1);
  expect(metrics.migrations[0].count).toBe(2);
  });

  it('ne migre pas si aucune resource outdated', async () => {
    const repo = new MemoryRepo();
    const service = new MigrationService(repo as any);

    const r: Resource = { id: 'rX', type: 'demo', workspaceId: 'w1', createdAt: Date.now(), updatedAt: Date.now(), version: 1, schemaVersion: 2, payload: { value: 5 } };
    await repo.save(r);

    const pending = await service.pendingMigrations('w1');
    expect(pending.total).toBe(0);

    const result = await service.migrateWorkspace('w1');
    expect(result.migrated).toBe(0);
    expect(result.touchedIds.length).toBe(0);
  });
});
