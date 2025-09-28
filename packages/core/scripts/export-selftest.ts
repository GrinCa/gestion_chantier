/**
 * export-selftest.ts
 * ---------------------------------------------------------------------------
 * Génère un export NDJSON des resources d'un workspace.
 */
import { bootstrapKernel } from '../kernel/bootstrap/KernelBootstrap.js';

async function main(){
  const k = bootstrapKernel();
  await k.resourceService.create({ type:'note', workspaceId:'w1', payload:{ text:'Export one', tags:['e'] }});
  await k.resourceService.create({ type:'measurement', workspaceId:'w1', payload:{ value: 10 } });
  const list = await k.repository.list('w1', { limit: 100 });
  const ndjson = list.data.map(r=> JSON.stringify(r)).join('\n');
  if(!ndjson.includes('Export one')) { console.error('Export missing note'); process.exit(1); }
  console.log('Export self-test OK');
}
main().catch(e=>{ console.error(e); process.exit(1); });
