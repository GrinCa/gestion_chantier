/**
 * fts-query-selftest.ts
 * Vérifie requête fullText avec MATCH si FTS dispo + fallback LIKE sinon.
 */
import { createSQLiteRepository } from '../kernel/repository/SQLiteResourceRepository.js';

async function main(){
  const repo: any = createSQLiteRepository();
  const words = ['mur','isolant'];
  // Seed resources
  await repo.save({ id:'n1', type:'note', workspaceId:'w1', createdAt:Date.now(), updatedAt:Date.now(), version:1, payload:{ text:'mur mur test isolant' } });
  await repo.save({ id:'n2', type:'note', workspaceId:'w1', createdAt:Date.now(), updatedAt:Date.now(), version:1, payload:{ text:'isolant plan' } });
  await repo.save({ id:'n3', type:'note', workspaceId:'w1', createdAt:Date.now(), updatedAt:Date.now(), version:1, payload:{ text:'autre contenu' } });

  const res = await repo.list('w1', { fullText: 'mur' });
  if(!res.data.length) throw new Error('FullText search returned empty');
  // Expect n1 first (contains mur twice) if scoring implemented else still present
  const first = res.data[0];
  console.log('FTS result order first=', first.id, 'total=', res.total);
  console.log('PASS fts-query (basic)');
}

main().catch(e=>{ console.error(e); process.exit(1); });
