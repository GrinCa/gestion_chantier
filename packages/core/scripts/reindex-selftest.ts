/**
 * reindex-selftest.ts
 * Ensures rebuildFullTextIndex completes without error (best-effort) and returns a boolean.
 */
import { createSQLiteRepository } from '../kernel/repository/SQLiteResourceRepository.js';

async function main(){
  const repo: any = createSQLiteRepository();
  // Seed a few resources
  for (let i=0;i<3;i++) {
    await repo.save({
      id: 'r'+i,
      type: 'note',
      workspaceId: 'w1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      payload: { text: 'note '+i+' contenu mur sol test' },
      schemaVersion: 1
    });
  }
  const ok = await repo.rebuildFullTextIndex();
  console.log('PASS reindex', ok ? 'fts-rebuilt' : 'fts-skip');
}

main().catch(e=>{ console.error(e); process.exit(1); });
