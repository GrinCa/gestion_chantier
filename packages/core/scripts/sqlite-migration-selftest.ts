/**
 * sqlite-migration-selftest.ts
 * Vérifie présence schema_version meta + indices + (optionnel) FTS.
 */
import { createSQLiteRepository } from '../kernel/repository/SQLiteResourceRepository.js';

async function main(){
  const repo: any = createSQLiteRepository();
  // Création d'une resource pour alimenter FTS si dispo
  await repo.save({
    id: 'r1', type: 'note', workspaceId: 'w1', createdAt: Date.now(), updatedAt: Date.now(), version: 1,
    payload: { text: 'mur principal test' }, schemaVersion: 1
  });
  const db = repo.__debugUnsafeDb();
  await new Promise<void>((resolve,reject)=>{
    db.get(`SELECT schema_value FROM __meta WHERE schema_key='schema_version'`, (e: Error | null, row: any)=>{
      if(e) return reject(e);
      if(!row) return reject(new Error('schema_version meta missing'));
      const v = parseInt(row.schema_value,10);
      if(v < 2) return reject(new Error('expected schema_version >=2'));
      resolve();
    });
  });
  // Check index existence (best effort)
  await new Promise<void>((resolve,reject)=>{
    db.all(`PRAGMA index_list('resources')`, (e: Error | null, rows: any[])=>{
      if(e) return reject(e);
      const names = rows.map((r:any)=> r.name);
      if(!names.some((n:string)=> n.includes('workspace_type'))) {
        return reject(new Error('missing composite index workspace_type'));
      }
      resolve();
    });
  });
  console.log('PASS sqlite-migration meta/index ok');
}

main().catch(e=>{ console.error(e); process.exit(1); });
