/**
 * KernelBootstrap.ts
 * ---------------------------------------------------------------------------
 * Point d'entrée simplifié pour instancier l'ensemble des services noyau.
 */
import { EventBus } from '../events/EventBus.js';
import { createInMemoryRepository } from '../repository/ResourceRepository.js';
import { ResourceService } from '../services/ResourceService.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolExecutionService } from '../services/ToolExecutionService.js';
import { MetricsService } from '../services/MetricsService.js';
import { MigrationService } from '../services/MigrationService.js';
import { HealthService } from '../services/HealthService.js';
import { AllowAllAccessPolicy, AccessPolicy } from '../auth/AccessPolicy.js';
import { InMemoryIndexer } from '../indexer/Indexer.js';
import { IndexSubscriber } from '../indexer/IndexSubscriber.js';
import '../registry/builtins.js';

export interface KernelBootstrapOptions {
  policy?: AccessPolicy;
}

export function bootstrapKernel(opts?: KernelBootstrapOptions) {
  const events = new EventBus();
  const repository = createInMemoryRepository();
  const indexer = new InMemoryIndexer(async (id)=> repository.get(id));
  const indexSub = new IndexSubscriber(events, repository, indexer); indexSub.attach();
  const policy = opts?.policy || new AllowAllAccessPolicy();
  const migrations = new MigrationService(repository);
  const metrics = new MetricsService(events, indexer);
  const resourceService = new ResourceService(repository, events, policy);
  const toolRegistry = new ToolRegistry();
  const toolExec = new ToolExecutionService(toolRegistry, events, ()=>({ repo: repository, events, now: ()=>Date.now(), currentUser: ()=>null, workspaceId: ()=>null }), policy);
  const health = new HealthService(repository, metrics, migrations);
  return {
    events,
    repository,
    indexer,
    migrations,
    metrics,
    resourceService,
    toolRegistry,
    toolExec,
    health,
    policy
  };
}
