/**
 * resource-service-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie création + update (version++) via ResourceService.
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import { ResourceService } from '../kernel/services/ResourceService.js';
import '../kernel/registry/builtins.js';

async function main(){
  const repo = createInMemoryRepository();
  const bus = new EventBus();
  const service = new ResourceService(repo, bus);
  const created = await service.create({ type: 'note', workspaceId: 'wsX', payload: { text: 'Alpha' }, origin: 'tool:test' });
  const updated = await service.update(created.id, { payload: { text: 'Alpha+', extra: true } });
  if (updated.version !== 2) { console.error('Version not incremented'); process.exit(1); }
  console.log('ResourceService OK version=', updated.version);
}
main().catch(e=>{console.error(e);process.exit(1);});
