/**
 * indexer-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie que l'IndexSubscriber indexe les resources automatiquement
 * et que la recherche retourne les bons résultats.
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import { ResourceService } from '../kernel/services/ResourceService.js';
import { createInMemoryIndexer } from '../kernel/indexer/Indexer.js';
import { IndexSubscriber } from '../kernel/indexer/IndexSubscriber.js';
import '../kernel/registry/builtins.js';

async function main(){
  const bus = new EventBus();
  const repo = createInMemoryRepository();
  const service = new ResourceService(repo, bus);
  const indexer = createInMemoryIndexer(id => repo.get(id));
  const sub = new IndexSubscriber(bus, repo, indexer);
  sub.attach();

  const r1 = await service.create({ type: 'note', workspaceId: 'w1', payload: { text: 'Mur porteur en béton' } });
  const r2 = await service.create({ type: 'note', workspaceId: 'w1', payload: { text: 'Hauteur mur 2.45m' } });
  await service.update(r2.id, { payload: { text: 'Hauteur mur 2.50m révisée' } });

  const found = await indexer.search('w1', 'mur 2.50');
  console.log('Index search results:', found.map(r=>r.id));
  if (!found.some(r => r.id === r2.id)) {
    console.error('Indexer test FAILED');
    process.exit(1);
  }
  console.log('Indexer self-test OK (size=', indexer.size(), ')');
}
main().catch(e=>{console.error(e);process.exit(1);});
