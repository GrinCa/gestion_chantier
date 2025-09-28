/**
 * measurement-migration-selftest.ts
 * ---------------------------------------------------------------------------
 * Vérifie upgrade measurement v1->v2 (ajout unit par défaut)
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import { ResourceService } from '../kernel/services/ResourceService.js';
import { MigrationService } from '../kernel/services/MigrationService.js';
import '../kernel/registry/builtins.js';

async function main(){
  const repo = createInMemoryRepository();
  const bus = new EventBus();
  const service = new ResourceService(repo, bus);
  // Crée une resource measurement en simulant ancienne version 1
  const m = await service.create({ type:'measurement', workspaceId:'w1', payload:{ value: 42 } });
  (m as any).schemaVersion = 1; await repo.save(m);
  const migrator = new MigrationService(repo);
  await migrator.migrateWorkspace('w1');
  const after = await repo.get(m.id);
  if(!after) { console.error('Measurement missing after migration'); process.exit(1); }
  if(after.schemaVersion !== 2) { console.error('Measurement not upgraded'); process.exit(1); }
  if(!after.payload.unit) { console.error('Unit not set by migration'); process.exit(1); }
  console.log('Measurement migration self-test OK');
}
main().catch(e=>{ console.error(e); process.exit(1); });
