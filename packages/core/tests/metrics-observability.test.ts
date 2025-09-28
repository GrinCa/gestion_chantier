import { describe, it, expect } from 'vitest';
import { EventBus } from '../kernel/events/EventBus.js';
import { MetricsService } from '../kernel/services/MetricsService.js';
import { InMemoryResourceRepository, InstrumentedResourceRepository } from '../kernel/repository/ResourceRepository.js';
import { ExportService } from '../kernel/services/ExportService.js';
import { AllowAllAccessPolicy, InstrumentedAccessPolicy } from '../kernel/auth/AccessPolicy.js';

function makeResource(id: string, workspaceId: string){
  return { id, type: 'doc', workspaceId, createdAt: Date.now(), updatedAt: Date.now(), version: 1, payload: { title: 't'+id }, metadata: { tag: 'x' } } as any;
}

describe('observability metrics', ()=>{
  it('collects repository latencies, exports and access denied', async ()=>{
    const bus = new EventBus();
    const metrics = new MetricsService(bus as any);
    const repo = new InstrumentedResourceRepository(new InMemoryResourceRepository(), metrics as any);
    // seed
    for (let i=0;i<5;i++) await repo.save(makeResource('r'+i,'w1'));
    await repo.list('w1', { limit: 10 });
    // export
    const exportSvc = new ExportService(repo, new AllowAllAccessPolicy(), metrics);
    await exportSvc.exportWorkspace('w1');
    await exportSvc.exportWorkspaceIncremental('w1', Date.now()-1000);

    // access denied simulation
    const denyPolicy = new InstrumentedAccessPolicy({ can: ()=> false }, bus as any, metrics as any);
    await denyPolicy.can('resource:delete', { userId: 'u1' });

    const snap = metrics.snapshot();
    expect(snap.repository?.ops.save.count).toBe(5);
  // list called once explicitly + 2 via export (full + incremental) = 3
  expect(snap.repository?.ops.list.count).toBe(3);
    expect(snap.export?.total).toBe(2); // full + incremental
    expect(snap.accessDenied?.total).toBe(1);
  });
});
