/**
 * metrics-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie la collecte basique de métriques (events + tool exec durations + index size)
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import { ResourceService } from '../kernel/services/ResourceService.js';
import { InMemoryIndexer } from '../kernel/indexer/Indexer.js';
import { IndexSubscriber } from '../kernel/indexer/IndexSubscriber.js';
import { ToolRegistry } from '../kernel/tools/ToolRegistry.js';
import { MetricsService } from '../kernel/services/MetricsService.js';
import { ToolExecutionService } from '../kernel/services/ToolExecutionService.js';
import '../kernel/registry/builtins.js';

async function main(){
  const bus = new EventBus();
  const repo = createInMemoryRepository();
  const indexer = new InMemoryIndexer(async (id)=> repo.get(id));
  const sub = new IndexSubscriber(bus, repo, indexer); sub.attach();
  const metrics = new MetricsService(bus, indexer);
  const resourceService = new ResourceService(repo, bus);

  const registry = new ToolRegistry();
  registry.register({ key:'echo', name:'Echo', version:'1.0.0', async execute(input: any){ return { echoed: input }; } });
  const exec = new ToolExecutionService(registry, bus, ()=>({ repo, events: bus, now: ()=>Date.now(), currentUser: ()=> 'u1', workspaceId: ()=> 'w1' }));

  // Create resources
  await resourceService.create({ type:'note', workspaceId:'w1', payload:{ text:'Hello world', tags:['a'] }});
  const r2 = await resourceService.create({ type:'note', workspaceId:'w1', payload:{ text:'Another note', tags:['b'] }});
  await resourceService.update(r2.id, { payload:{ text:'Another note modified' }});
  await resourceService.delete(r2.id);

  // Run tools
  await exec.run('echo', { value: 1 });
  await exec.run('echo', { value: 2 });
  await exec.run('echo', { value: 3 });

  const snap = metrics.snapshot();
  if(!snap.events['resource.created'] || !snap.events['tool.executed']) { console.error('Metrics missing counts'); process.exit(1); }
  if(snap.toolExec.count !== 3) { console.error('Tool exec count mismatch'); process.exit(1); }
  if(typeof snap.indexSize !== 'number') { console.error('Index size missing'); process.exit(1); }
  console.log('Metrics self-test OK', snap);
}
main().catch(e=>{ console.error(e); process.exit(1); });
