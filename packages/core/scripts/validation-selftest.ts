/**
 * validation-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie la validation Zod via DataTypeRegistry + DataEngine mirror.
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { DataEngine } from '../data-engine/index.js';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import '../kernel/registry/builtins.js';

class MemoryStorage { private m = new Map<string, any>();
  get(k:string){return Promise.resolve(this.m.get(k));}
  set(k:string,v:any){this.m.set(k,v);return Promise.resolve();}
  delete(k:string){this.m.delete(k);return Promise.resolve();}
  clear(){this.m.clear();return Promise.resolve();}
  keys(){return Promise.resolve([...this.m.keys()]);}
}
class DummyNetwork { isOnline(){return false;} onlineStatusChanged(){} async request(){return { success:true, timestamp:Date.now() };}}

async function main(){
  const engine = new DataEngine(new MemoryStorage(), new DummyNetwork(), { eventBus: new EventBus(), resourceRepo: createInMemoryRepository() });
    const workspace = await engine.createWorkspace({ name: 'ValProj', owner: 'u1' } as any);
    // Valid
    await engine.createData(workspace.id, 'note', { text: 'Validation OK', tags:['a'] }, 'tool:test');
  let failed = false;
  try {
  await engine.createData(workspace.id, 'note', { text: '' }, 'tool:test'); // invalid (empty)
  } catch (e) {
    failed = true;
  }
  console.log('Invalid note rejected:', failed);
  if (!failed) {
    console.error('Validation test FAILED (expected throw)');
    process.exit(1);
  } else {
    console.log('Validation self-test OK');
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
