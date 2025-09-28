/**
 * repository-selftest.ts
 * ---------------------------------------------------------------
 * Petit script de vérification rapide du InMemoryResourceRepository.
 */
import { createInMemoryRepository, Resource } from '../kernel/index.js';

const repo = createInMemoryRepository();

function makeResource(partial: Partial<Resource>): Resource {
  const now = Date.now();
  return {
    id: 'r_' + Math.random().toString(36).slice(2),
    type: partial.type || 'note',
    workspaceId: partial.workspaceId || 'ws1',
    createdAt: now,
    updatedAt: now,
    version: 1,
    payload: partial.payload ?? { text: 'hello world', tags: ['demo'] },
    metadata: partial.metadata
  };
}

async function main() {
  const r1 = await repo.save(makeResource({ payload: { text: 'Bonjour chantier', tags: ['chantier','salut'] } }));
  const r2 = await repo.save(makeResource({ payload: { text: 'Mesure hauteur mur', value: 2.45, unit: 'm' }, type: 'measurement' }));
  const r3 = await repo.save(makeResource({ payload: { text: 'Note confidentielle', tags: ['private'] } }));

  const listAll = await repo.list('ws1');
  console.log('Total ws1=', listAll.total);

  const searchNote = await repo.list('ws1', { fullText: 'chantier' });
  console.log('Search chantier ->', searchNote.data.map(r => r.id));

  const filterType = await repo.list('ws1', { types: ['measurement'] });
  console.log('Measurements ->', filterType.data.length);

  const filterContains = await repo.list('ws1', { filter: [{ field: 'payload.text', op: 'contains', value: 'Note' }] });
  console.log('Contains "Note" ->', filterContains.data.length);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
