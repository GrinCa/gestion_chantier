/**
 * sqlite-filters-selftest.ts
 * Vérifie filtres (types, date range), fullText LIKE, pagination, tri.
 */
import { createSQLiteRepository } from '../kernel/repository/SQLiteResourceRepository.js';
import type { Resource } from '../kernel/domain/Resource.js';

function res(partial: Partial<Resource>): Resource {
  const ts = partial.updatedAt || Date.now();
  return {
    id: partial.id || Math.random().toString(36).slice(2),
    type: partial.type || 'note',
    workspaceId: partial.workspaceId || 'wsql',
    createdAt: ts - 1000,
    updatedAt: ts,
    version: 1,
    payload: partial.payload || { text: 'hello '+(partial.type||'note') },
    schemaVersion: 1,
    origin: 'selftest'
  } as Resource;
}

async function main(){
  const repo = createSQLiteRepository();
  // Seed
  await repo.save(res({ type: 'note', payload: { text: 'mur principal' }, updatedAt: Date.now()-5000 }));
  await repo.save(res({ type: 'note', payload: { text: 'mesure dalle' } }));
  await repo.save(res({ type: 'measurement', payload: { text: 'hauteur mur', value: 2.4 } }));
  await repo.save(res({ type: 'measurement', payload: { text: 'largeur dalle', value: 3.1 } }));
  await repo.save(res({ type: 'note', payload: { text: 'plan chantier secret' } }));

  // Filter by type
  const measurements = await repo.list('wsql', { types: ['measurement'] });
  if (measurements.data.length !== 2) throw new Error('Expected 2 measurements');

  // Full text (LIKE)
  const mur = await repo.list('wsql', { fullText: 'mur' });
  if (mur.data.length < 2) throw new Error('Expected at least 2 containing mur');

  // UpdatedAt range (gt)
  const cutoff = Date.now()-2000;
  const recent = await repo.list('wsql', { filter: [{ field: 'updatedAt', op: 'gt', value: cutoff }] });
  if (recent.data.length === 0) throw new Error('Expected recent > 0');

  // Pagination
  const page1 = await repo.list('wsql', { limit: 2, offset: 0, sort: [{ field: 'updatedAt', dir: 'desc' }] });
  const page2 = await repo.list('wsql', { limit: 2, offset: 2, sort: [{ field: 'updatedAt', dir: 'desc' }] });
  if (page1.data.length !== 2 || page2.data.length !== 2) throw new Error('Pagination mismatch');
  if (page1.data[0].updatedAt < page1.data[1].updatedAt) throw new Error('Sort order wrong');

  console.log('PASS sqlite-filters');
}

main().catch(e=>{ console.error(e); process.exit(1); });
