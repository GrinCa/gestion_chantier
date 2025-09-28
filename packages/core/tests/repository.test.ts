import { describe, it, expect } from 'vitest';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import type { Resource } from '../kernel/domain/Resource.js';

function makeResource(partial: Partial<Resource>): Resource {
  const now = Date.now();
  return {
    id: partial.id || 'r_'+Math.random().toString(36).slice(2),
    type: partial.type || 'demo',
    workspaceId: partial.workspaceId || 'w1',
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    version: 1,
    payload: partial.payload || { label: 'X' }
  } as Resource;
}

describe('InMemoryResourceRepository', () => {
  it('sauvegarde et liste', async () => {
    const repo = createInMemoryRepository();
    await repo.save(makeResource({ id: 'a' }));
    await repo.save(makeResource({ id: 'b', payload: { label: 'Hello' }}));
    const list = await repo.list('w1', { limit: 10 });
    expect(list.total).toBe(2);
  });

  it('filtre fullText naive', async () => {
    const repo = createInMemoryRepository();
    await repo.save(makeResource({ id: 'a', payload: { label: 'Alpha' }}));
    await repo.save(makeResource({ id: 'b', payload: { label: 'Beta' }}));
    const list = await repo.list('w1', { fullText: 'alpha' });
    expect(list.data.length).toBe(1);
    expect(list.data[0].id).toBe('a');
  });
});
