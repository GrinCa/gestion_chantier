import { describe, it, expect } from 'vitest';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import type { Resource } from '../kernel/domain/Resource.js';

function make(id: string, payload: any): Resource {
  const now = Date.now();
  return { id, type: 'note', workspaceId: 'w1', createdAt: now, updatedAt: now, version: 1, payload } as Resource;
}

describe('InMemoryRepository fullText scoring', () => {
  it('classe par score décroissant si pas de sort explicite', async () => {
    const repo = createInMemoryRepository();
    await repo.save(make('a', { text: 'alpha beta beta' })); // beta x2
    await repo.save(make('b', { text: 'beta' })); // beta x1
    await repo.save(make('c', { text: 'gamma' })); // no beta

    const res = await repo.list('w1', { fullText: 'beta' });
    expect(res.data[0].id).toBe('a');
    expect(Object.keys(res.scores || {}).length).toBe(2);
    expect((res.scores||{})['a']).toBeGreaterThan((res.scores||{})['b']);
  });
});
