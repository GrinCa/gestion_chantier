/**
 * bridge-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie que créer des data via DataEngine + EventBus + Bridge
 * peuple bien le ResourceRepository.
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { DataEngine } from '../data-engine/index.js';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import { DataEngineBridge } from '../kernel/bridge/DataEngineBridge.js';
import '../kernel/registry/builtins.js';

class MemoryStorage { private m = new Map<string, any>();
  get(k:string){return Promise.resolve(this.m.get(k));}
  set(k:string,v:any){this.m.set(k,v);return Promise.resolve();}
  delete(k:string){this.m.delete(k);return Promise.resolve();}
  clear(){this.m.clear();return Promise.resolve();}
  keys(){return Promise.resolve([...this.m.keys()]);}
}
class DummyNetwork { isOnline(){return true;} onlineStatusChanged(){} async request(){return { success:true, timestamp:Date.now() };}}

async function main(){
  const bus = new EventBus();
  const repo = createInMemoryRepository();
  const bridge = new DataEngineBridge({ eventBus: bus, repository: repo });
  bridge.attach();
  const engine = new DataEngine(new MemoryStorage(), new DummyNetwork(), { eventBus: bus, resourceRepo: repo });
    const workspace = await engine.createWorkspace({ name:'Test', owner:'u1' } as any);
    await engine.createData(workspace.id, 'note', { text:'Hello Bridge', tags:['bridge','test'] }, 'tool:test');
  const listed = await repo.list(workspace.id, { fullText: 'hello' });
  console.log('Bridge resources count:', listed.total);
  if (listed.total !== 1) {
    console.error('Bridge test FAILED');
    process.exit(1);
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
