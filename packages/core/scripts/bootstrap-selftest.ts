/**
 * bootstrap-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie que bootstrapKernel fournit un pipeline fonctionnel end-to-end.
 */
import { bootstrapKernel } from '../kernel/bootstrap/KernelBootstrap.js';

async function main(){
  const kernel = bootstrapKernel();
  const r = await kernel.resourceService.create({ type:'note', workspaceId:'w1', payload:{ text:'Bootstrap OK', tags:['b'] }});
  await kernel.toolRegistry.register({ key:'noop', name:'Noop', version:'1.0.0', async execute(){ return { ok:true }; } });
  await kernel.toolExec.run('noop', {});
  const health = await kernel.health.snapshot('w1', async ()=>({ pending_changes:0, status:'synced' }));
  if(!health.metrics?.events['resource.created']) { console.error('Bootstrap metrics missing'); process.exit(1); }
  console.log('Bootstrap self-test OK');
}
main().catch(e=>{ console.error(e); process.exit(1); });
