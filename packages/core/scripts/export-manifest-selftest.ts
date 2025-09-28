/**
 * export-manifest-selftest.ts
 * Vérifie ExportService.exportWorkspaceWithManifest
 */
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import { ExportService } from '../kernel/services/ExportService.js';
import type { Resource } from '../kernel/domain/Resource.js';

function makeResource(partial: Partial<Resource>): Resource {
  const ts = Date.now();
  return {
    id: partial.id || Math.random().toString(36).slice(2),
    type: partial.type || 'note',
    workspaceId: partial.workspaceId || 'ws-demo',
    createdAt: ts,
    updatedAt: ts,
    version: 1,
    payload: partial.payload || { text: 'demo' },
    schemaVersion: 1,
    origin: 'selftest'
  } as Resource;
}

async function main(){
  const repo = createInMemoryRepository();
  await repo.save(makeResource({ type: 'note', payload: { text: 'A' }}));
  await repo.save(makeResource({ type: 'note', payload: { text: 'B' }}));
  await repo.save(makeResource({ type: 'measurement', payload: { value: 12, unit: 'm' }}));

  const service = new ExportService(repo);
  const { manifest, ndjson } = await service.exportWorkspaceWithManifest('ws-demo');

  const lines = ndjson.trim().split('\n');
  const ok = manifest.count === lines.length
    && manifest.types.note === 2
    && manifest.types.measurement === 1
    && manifest.workspaceId === 'ws-demo';

  if(!ok){
    console.error('FAIL', { manifest, lines: lines.length });
    process.exit(1);
  }
  console.log('PASS export-manifest', manifest);
}

main().catch(e=>{ console.error(e); process.exit(1); });
