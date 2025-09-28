/**
 * kernel-selftest.ts
 * ---------------------------------------------------------------------------
 * Script de vérification rapide du noyau :
 *  - Charge les data types built-in
 *  - Instancie un EventBus
 *  - Simule la création d'un projet + data via DataEngine (événements)
 *  - Affiche un récapitulatif JSON
 */

import { NoopEventBus, EventBus } from '../kernel/events/EventBus.js';
import { BUILTIN_DATA_TYPES } from '../kernel/index.js';
import { DataEngine, type StorageAdapter, type NetworkAdapter } from '../data-engine/index.js';

// Adapters in-memory simplifiés
class MemoryStorage implements StorageAdapter {
  private store = new Map<string, any>();
  async get(key: string) { return this.store.get(key); }
  async set(key: string, value: any) { this.store.set(key, value); }
  async delete(key: string) { this.store.delete(key); }
  async clear() { this.store.clear(); }
  async keys() { return [...this.store.keys()]; }
}

class DummyNetwork implements NetworkAdapter {
  async request<T>(_method: string, _endpoint: string, _data?: any) {
    return { success: false, timestamp: Date.now() } as any; // offline simulated
  }
  isOnline() { return false; }
  onlineStatusChanged() { /* noop */ }
}

async function main() {
  const events: any[] = [];
  const bus = new EventBus();
  bus.onAny(e => { events.push(e); });

  const engine = new DataEngine(new MemoryStorage(), new DummyNetwork(), { eventBus: bus });

  // Simule project & data
  const project = await engine.createProject({ name: 'Test Workspace', owner: 'user-1' } as any);
  await engine.createData(project.id, 'measurement', { value: 42, unit: 'm' }, 'tool:calc');
  await engine.createData(project.id, 'note', { text: 'Ceci est une note', tags: ['demo'] }, 'tool:note');

  const output = {
    builtinsLoaded: BUILTIN_DATA_TYPES,
    projectId: project.id,
    eventCount: events.length,
    events: events.map(e => ({ op: e.operation, type: e.entityType, id: e.entityId }))
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

// Lancement si exécuté directement
// @ts-ignore
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}

export {}; // ensure module scope