import { describe, it, expect, beforeAll } from 'vitest';
import { DataEngine } from '../data-engine/index.js';
import { globalDataTypeRegistry } from '../kernel/registry/DataTypeRegistry.js';
import type { StorageAdapter, NetworkAdapter } from '../data-engine/index.js';

// Minimal in‑memory storage adapter
class MemoryStorage implements StorageAdapter {
  private store = new Map<string, any>();
  async get(key: string) { return this.store.get(key); }
  async set(key: string, value: any) { this.store.set(key, value); }
  async delete(key: string) { this.store.delete(key); }
  async clear() { this.store.clear(); }
  async keys() { return Array.from(this.store.keys()); }
}

// Offline network adapter stub (simulate always offline so local query path used)
class OfflineNetwork implements NetworkAdapter {
  async request<T>(_method: string, _endpoint: string): Promise<any> {
    throw new Error('Should not perform network request in offline test');
  }
  isOnline() { return false; }
  onlineStatusChanged() { /* noop */ }
}

describe('DataEngine workspace_id canonical queries', () => {
  beforeAll(() => {
    try { globalDataTypeRegistry.register({ type: 'measurement', schemaVersion: 1, validate: () => {} }); } catch {}
  });

  it('createData enregistre workspace_id + project_id (legacy mirror) et queryData accepte workspace_id seul', async () => {
    const engine = new DataEngine(new MemoryStorage(), new OfflineNetwork());

    // Préparer un workspace (simulate direct storage insertion suffices for this test)
    await (engine as any)['storage'].set('project:w1', {
      id: 'w1', name: 'Workspace 1', domain: 'test', metadata: {}, owner: 'u1', created_at: Date.now(), updated_at: Date.now()
    });

    await engine.createData('w1', 'measurement', { value: 10 }, 'toolA');
    await engine.createData('w1', 'measurement', { value: 20 }, 'toolA');
    await engine.createData('w2', 'measurement', { value: 30 }, 'toolA'); // autre workspace (non déclaré mais OK pour test)

    const result = await engine.queryData({ workspace_id: 'w1' });
    expect(result.total).toBe(2);
    expect(result.data.every(d => d.workspace_id === 'w1')).toBe(true);
    expect(result.data.every(d => d.project_id === 'w1')).toBe(true); // legacy mirror
  });

  it('queryData avec project_id (legacy) retourne mêmes résultats', async () => {
    const engine = new DataEngine(new MemoryStorage(), new OfflineNetwork());
    await (engine as any)['storage'].set('project:w1', { id: 'w1', name: 'W1', domain: 'test', metadata: {}, owner: 'u1', created_at: Date.now(), updated_at: Date.now() });
    await engine.createData('w1', 'measurement', { value: 1 }, 'tool');
    const byWorkspace = await engine.queryData({ workspace_id: 'w1' });
    const byProject = await engine.queryData({ project_id: 'w1' });
    expect(byProject.total).toBe(byWorkspace.total);
    expect(byProject.data[0].workspace_id).toBe('w1');
  });

  it('rejette si aucun workspace_id ni project_id fourni', async () => {
    const engine = new DataEngine(new MemoryStorage(), new OfflineNetwork());
    await expect(engine.queryData({} as any)).rejects.toThrow(/workspace_id/);
  });
});
