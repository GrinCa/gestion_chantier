import { describe, it, expect } from 'vitest';
import { DataEngine } from '../data-engine/index.js';
import { wrapDataEngineWorkspaceCompat } from '../compat/WorkspaceKeyCompat.js';
import type { StorageAdapter, NetworkAdapter } from '../data-engine/index.js';

class MemoryStorage implements StorageAdapter {
  private store = new Map<string, any>();
  async get(key: string) { return this.store.get(key); }
  async set(key: string, value: any) { this.store.set(key, value); }
  async delete(key: string) { this.store.delete(key); }
  async clear() { this.store.clear(); }
  async keys() { return Array.from(this.store.keys()); }
}
class OfflineNetwork implements NetworkAdapter {
  async request<T>(_method: string, _endpoint: string): Promise<any> {
    // Simulate offline network: always fail
    return { success: false, error: 'offline', timestamp: Date.now() };
  }
  isOnline() { return false; }
  onlineStatusChanged() { /* noop */ }
}

describe('WorkspaceKeyCompat wrapper', () => {
  it('falls back to legacy project: key and mirrors to workspace:', async () => {
    const storage = new MemoryStorage();
    const network = new OfflineNetwork();
    const engine = new DataEngine(storage, network);
    // seed legacy only
    await storage.set('project:legacy1', { id: 'legacy1', name: 'Legacy', domain: 't', metadata: {}, owner: 'u', created_at: 1, updated_at: 1 });
    const wrapped = wrapDataEngineWorkspaceCompat(engine, { enableWarnings: false });

    const ws = await wrapped.getWorkspace('legacy1');
    expect(ws).toBeTruthy();
    expect(await storage.get('workspace:legacy1')).toBeTruthy();
    expect(wrapped.getLegacyFallbackCount()).toBe(1);
  });
});
