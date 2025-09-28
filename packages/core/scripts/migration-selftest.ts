/**
 * migration-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie qu'une ressource note v1 est migrée vers v2 (ajout category) via MigrationService.
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

  // Simule création ancienne version: on force schemaVersion=1 avant upgrade global (2)
  const res = await service.create({ type: 'note', workspaceId: 'w1', payload: { text: 'Note très importante', tags:['important'] } });
  // Force rétrograder l'attribut schemaVersion pour simuler ancienne donnée
  (res as any).schemaVersion = 1; await repo.save(res);

  const migrator = new MigrationService(repo);
  const result = await migrator.migrateWorkspace('w1');
  const after = await repo.get(res.id);

  if (!after || after.schemaVersion !== 2) { console.error('Schema version not upgraded'); process.exit(1); }
  if (after.payload.category !== 'important') { console.error('Category migration rule failed'); process.exit(1); }
  console.log('Migration self-test OK migrated=', result.migrated);
}
main().catch(e=>{console.error(e);process.exit(1);});
