/**
 * quickstart-demo.ts
 * ---------------------------------------------------------------
 * Démonstration end-to-end d'utilisation du noyau "lite".
 * 1. Bootstrap du kernel
 * 2. Création de resources (note, measurement)
 * 3. Migration measurement v1->v2 simulée
 * 4. Enregistrement d'un outil avec schémas d'input/output (Zod)
 * 5. Exécution outil + métriques + health snapshot + export NDJSON
 */
import { z } from 'zod';
import { bootstrapKernel } from '../kernel/bootstrap/KernelBootstrap.js';
import { MigrationService } from '../kernel/services/MigrationService.js';

async function main(){
  const k = bootstrapKernel();

  // 1. Create resources
  const note = await k.resourceService.create({ type:'note', workspaceId:'demo', payload:{ text:'Hello Core', tags:['important'] }});
  const meas = await k.resourceService.create({ type:'measurement', workspaceId:'demo', payload:{ value: 12.5 } });

  // 2. Simulate old version for measurement (downgrade schemaVersion then migrate back)
  (meas as any).schemaVersion = 1; await k.repository.save(meas);
  const migrator = new MigrationService(k.repository);
  await migrator.migrateWorkspace('demo');
  const measAfter = await k.repository.get(meas.id);

  // 3. Register a tool with input/output schemas
  k.toolRegistry.register({
    key:'sum', name:'Adder', version:'1.0.0',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.object({ total: z.number() }),
    async execute(input){ return { total: input.a + input.b }; }
  });
  const execRes = await k.toolExec.run('sum', { a: 2, b: 5 });

  // 4. Metrics & Health
  const health = await k.health.snapshot('demo', async ()=>({ status:'synced', pending_changes:0 }));

  // 5. Export NDJSON
  const list = await k.repository.list('demo', { limit: 100 });
  const ndjson = list.data.map(r=>JSON.stringify(r)).join('\n');

  console.log('--- QUICKSTART OUTPUT ---');
  console.log('Note ID:', note.id);
  console.log('Measurement migrated unit:', (measAfter as any)?.payload?.unit);
  console.log('Tool sum result:', execRes.output);
  console.log('Metrics events keys:', Object.keys(health.metrics?.events||{}));
  console.log('Export NDJSON lines:', ndjson.split('\n').length);
  console.log('Health OK:', health.ok);
}
main().catch(e=>{ console.error(e); process.exit(1); });
