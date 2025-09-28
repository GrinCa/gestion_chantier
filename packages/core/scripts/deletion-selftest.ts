/**
 * deletion-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie create -> index -> delete -> désindexation.
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import { ResourceService } from '../kernel/services/ResourceService.js';
import { InMemoryIndexer } from '../kernel/indexer/Indexer.js';
import { IndexSubscriber } from '../kernel/indexer/IndexSubscriber.js';
import '../kernel/registry/builtins.js';

async function main(){
  const repo = createInMemoryRepository();
  const bus = new EventBus();
  const service = new ResourceService(repo, bus);
  const indexer = new InMemoryIndexer(async (id)=> repo.get(id));
  const sub = new IndexSubscriber(bus, repo, indexer); sub.attach();

  const res = await service.create({ type:'note', workspaceId:'w1', payload:{ text:'Bonjour index', tags:['x'] }});
  const found = await indexer.search('w1', 'bonjour');
  if(!found.find(r=>r.id===res.id)) { console.error('Resource non indexée'); process.exit(1); }
  await service.delete(res.id);
  const foundAfter = await indexer.search('w1', 'bonjour');
  if(foundAfter.find(r=>r.id===res.id)) { console.error('Resource encore présente après delete'); process.exit(1); }
  console.log('Deletion self-test OK');
}
main().catch(e=>{ console.error(e); process.exit(1); });
