/**
 * Conflict Self-Test Script
 * Goal: Validate optimistic locking + conflict event emission.
 * Usage: ts-node handbook/scripts/conflict-selftest.ts
 */

import { EventEmitter } from 'events';

// Lightweight stand-ins; adjust imports to real paths when integrating into full kernel.
// Assumptions (replace with actual):
// - ResourceService exposes: create(resource), update(id, patch, { expectedVersion })
// - EventBus is an EventEmitter-like instance with on(event, cb)
// - Resource shape: { id, type, version, data, schemaVersion }

interface Resource {
  id: string;
  type: string;
  version: number;
  data: any;
  schemaVersion: number;
}

class InMemoryRepo {
  store = new Map<string, Resource>();
  async create(r: Resource) {
    this.store.set(r.id, r); return r;
  }
  async get(id: string) { return this.store.get(id) || null; }
  async update(id: string, updater: (r: Resource) => Resource) {
    const cur = this.store.get(id); if (!cur) throw new Error('not found');
    const next = updater(cur); this.store.set(id, next); return next;
  }
}

class EventBus extends EventEmitter {
  emitEvent(event: string, payload: any) { this.emit(event, payload); }
}

class ResourceService {
  constructor(private repo: InMemoryRepo, private bus: EventBus) {}
  async create(input: Omit<Resource, 'version'> & { version?: number }) {
    const resource: Resource = { version: input.version ?? 1, ...input } as Resource;
    await this.repo.create(resource);
    this.bus.emitEvent('resource.created', { resource });
    return resource;
  }
  async update(id: string, patch: Partial<{ data: any }>, opts: { expectedVersion?: number } = {}) {
    return this.repo.update(id, (cur) => {
      if (opts.expectedVersion && cur.version !== opts.expectedVersion) {
        this.bus.emitEvent('resource.conflict', { id, expected: opts.expectedVersion, actual: cur.version });
        throw Object.assign(new Error('Version conflict'), { code: 'RESOURCE_VERSION_CONFLICT', expected: opts.expectedVersion, actual: cur.version });
      }
      const next: Resource = { ...cur, data: patch.data ?? cur.data, version: cur.version + 1 };
      this.bus.emitEvent('resource.updated', { resource: next });
      return next;
    });
  }
}

async function main() {
  const bus = new EventBus();
  const repo = new InMemoryRepo();
  const service = new ResourceService(repo, bus);

  const events: { conflict: any[]; updated: any[] } = { conflict: [], updated: [] };
  bus.on('resource.conflict', (e) => events.conflict.push(e));
  bus.on('resource.updated', (e) => events.updated.push(e));

  const r = await service.create({ id: 'r1', type: 'note', data: { text: 'v1' }, schemaVersion: 1 });

  // Simulate two parallel reads
  const clientA = { snapshotVersion: r.version };
  const clientB = { snapshotVersion: r.version };

  // Client A updates successfully
  await service.update('r1', { data: { text: 'A edit' } }, { expectedVersion: clientA.snapshotVersion });

  // Client B attempts stale update -> should conflict
  let conflictCaught = false;
  try {
    await service.update('r1', { data: { text: 'B edit (stale)' } }, { expectedVersion: clientB.snapshotVersion });
  } catch (err: any) {
    if (err.code === 'RESOURCE_VERSION_CONFLICT') conflictCaught = true; else throw err;
  }

  // Assertions
  const pass = conflictCaught && events.conflict.length === 1 && events.updated.length === 1;
  if (!pass) {
    console.error('FAIL', { conflictCaught, events });
    process.exit(1);
  }
  console.log('PASS optimistic-locking + conflict event', events.conflict[0]);
}

main().catch(e => { console.error(e); process.exit(1); });
