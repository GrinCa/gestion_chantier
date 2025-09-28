/**
 * health-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie snapshot health agrégé.
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import { ResourceService } from '../kernel/services/ResourceService.js';
import { MetricsService } from '../kernel/services/MetricsService.js';
import { HealthService } from '../kernel/services/HealthService.js';
import { MigrationService } from '../kernel/services/MigrationService.js';
import '../kernel/registry/builtins.js';

async function main(){
  const repo = createInMemoryRepository();
  const bus = new EventBus();
  const metrics = new MetricsService(bus);
  const migrations = new MigrationService(repo);
  const health = new HealthService(repo, metrics, migrations);
  const service = new ResourceService(repo, bus);
  await service.create({ type:'note', workspaceId:'wX', payload:{ text:'Health check', tags:['ok'] }});
  const snap = await health.snapshot('wX', async ()=>({ pending_changes:0, status:'synced' }));
  if(!snap.metrics?.events['resource.created']) { console.error('Health snapshot missing metrics'); process.exit(1); }
  if(!snap.migrations) { console.error('Health snapshot missing migrations'); process.exit(1); }
  console.log('Health self-test OK', snap.ok);
}
main().catch(e=>{ console.error(e); process.exit(1); });
