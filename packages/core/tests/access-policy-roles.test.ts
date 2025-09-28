import { describe, it, expect } from 'vitest';
import { RoleBasedAccessPolicy, StaticRoleResolver, InstrumentedAccessPolicy } from '../kernel/auth/AccessPolicy.js';

describe('RoleBasedAccessPolicy', () => {
  it('owner a accès total', async () => {
    const policy = new RoleBasedAccessPolicy(new StaticRoleResolver('owner'));
    expect(await policy.can('resource:create')).toBe(true);
    expect(await policy.can('resource:delete')).toBe(true);
    expect(await policy.can('migration:run')).toBe(true);
    expect(await policy.can('export:run')).toBe(true);
  });
  it('editor ne peut pas delete ni migration', async () => {
    const policy = new RoleBasedAccessPolicy(new StaticRoleResolver('editor'));
    expect(await policy.can('resource:create')).toBe(true);
    expect(await policy.can('resource:delete')).toBe(false);
    expect(await policy.can('migration:run')).toBe(false);
  });
  it('reader seulement tool:execute', async () => {
    const policy = new RoleBasedAccessPolicy(new StaticRoleResolver('reader'));
    expect(await policy.can('tool:execute')).toBe(true);
    expect(await policy.can('export:run')).toBe(false);
    expect(await policy.can('resource:update')).toBe(false);
  });
});

describe('InstrumentedAccessPolicy', () => {
  it('émet access.denied sur refus', async () => {
    const events: any[] = [];
    const emitter = { emit: (type: string, payload: any) => { events.push({ type, payload }); } };
    const base = new RoleBasedAccessPolicy(new StaticRoleResolver('reader'));
    const policy = new InstrumentedAccessPolicy(base, emitter);
    await policy.can('resource:delete');
    expect(events.some(e => e.type === 'access.denied')).toBe(true);
  });
});
