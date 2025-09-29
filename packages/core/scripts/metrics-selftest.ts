/**
 * metrics-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie la collecte basique de métriques (events + tool exec durations + index size)
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { createInMemoryRepository, InstrumentedResourceRepository } from '../kernel/repository/ResourceRepository.js';
import { ResourceService } from '../kernel/services/ResourceService.js';
import { InMemoryIndexer } from '../kernel/indexer/Indexer.js';
import { IndexSubscriber } from '../kernel/indexer/IndexSubscriber.js';
import { ToolRegistry } from '../kernel/tools/ToolRegistry.js';
import { MetricsService } from '../kernel/services/MetricsService.js';
import { ToolExecutionService } from '../kernel/services/ToolExecutionService.js';
import '../kernel/registry/builtins.js';

// Minimal ambient decl (avoid pulling full @types/node just for self-test build context)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const process: any;

async function main(){
  const bus = new EventBus();
  const baseRepo = createInMemoryRepository();
  const indexer = new InMemoryIndexer(async (id)=> baseRepo.get(id));
  const metrics = new MetricsService(bus, indexer);
  const repo = new InstrumentedResourceRepository(baseRepo, metrics);
  const sub = new IndexSubscriber(bus, repo as any, indexer); sub.attach();
  const resourceService = new ResourceService(repo, bus);

  const registry = new ToolRegistry();
  registry.register({ key:'echo', name:'Echo', version:'1.0.0', async execute(input: any){ return { echoed: input }; } });
  const exec = new ToolExecutionService(registry, bus, ()=>({ repo, events: bus, now: ()=>Date.now(), currentUser: ()=> 'u1', workspaceId: ()=> 'w1' }));

  // Create resources + additional ops to accumulate latency samples
  for (let i=0;i<12;i++) {
    const r = await resourceService.create({ type:'note', workspaceId:'w1', payload:{ text:'Hello '+i, tags:['t'] }});
    if (i % 3 === 0) {
      await resourceService.update(r.id, { payload:{ text:'Hello '+i+' updated'} });
    }
  }
  // list queries for latency distribution
  for (let i=0;i<6;i++) { await repo.list('w1', { limit: 5, offset: i }); }

  // Run tools
  await exec.run('echo', { value: 1 });
  await exec.run('echo', { value: 2 });
  await exec.run('echo', { value: 3 });

  const snap = metrics.snapshot();
  if(!snap.events['resource.created'] || !snap.events['tool.executed']) { console.error('Metrics missing counts'); process.exit(1); }
  if(snap.toolExec.count !== 3) { console.error('Tool exec count mismatch'); process.exit(1); }
  if(typeof snap.indexSize !== 'number') { console.error('Index size missing'); process.exit(1); }
  if(!snap.repository || !snap.repository.ops.list) { console.error('Missing repository latency metrics'); process.exit(1); }
  const repoSnap = snap.repository as any; // assert non-null after guard
  const op = repoSnap.ops.list;
  if(typeof op.p50Ms !== 'number' || typeof op.p95Ms !== 'number') { console.error('Percentiles missing'); process.exit(1); }
  console.log('Metrics self-test OK', snap);
}
main().catch(e=>{ console.error(e); process.exit(1); });
