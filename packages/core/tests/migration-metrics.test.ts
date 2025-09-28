import { describe, it, expect } from 'vitest';
import { EventBus } from '../kernel/events/EventBus.js';
import { MetricsService } from '../kernel/services/MetricsService.js';
import { InMemoryResourceRepository, InstrumentedResourceRepository } from '../kernel/repository/ResourceRepository.js';
import { MigrationService } from '../kernel/services/MigrationService.js';

// Fake registry injection
import { globalDataTypeRegistry } from '../kernel/registry/DataTypeRegistry.js';

// Register test descriptor if not present
try {
  (globalDataTypeRegistry as any).register({ type: 'demoType', schemaVersion: 2, migrate: (payload: any)=> ({ ...payload, upgraded: true }) });
} catch { /* ignore duplicate in watch mode */ }

function makeResource(id: string){
  return { id, type: 'demoType', workspaceId: 'w1', createdAt: Date.now()-1000, updatedAt: Date.now()-1000, version: 1, schemaVersion: 1, payload: { a: 1 } } as any;
}

describe('migration metrics', ()=>{
  it('records migration stats', async ()=>{
    const bus = new EventBus();
    const metrics = new MetricsService(bus as any);
    const repo = new InstrumentedResourceRepository(new InMemoryResourceRepository(), metrics as any);
    // seed outdated resources
    await repo.save(makeResource('m1'));
    await repo.save(makeResource('m2'));
    const mig = new MigrationService(repo, metrics);
    const res = await mig.migrateWorkspace('w1');
    expect(res.migrated).toBe(2);
    const snap = metrics.snapshot();
    expect(snap.migration?.total).toBe(1);
    expect(snap.migration?.resourcesTouched).toBeGreaterThanOrEqual(2);
  });
});
