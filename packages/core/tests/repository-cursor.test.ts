import { describe, it, expect } from 'vitest';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';
import type { Resource } from '../kernel/domain/Resource.js';

function make(id: string, updatedAt: number): Resource {
  return { id, type: 'note', workspaceId: 'w1', createdAt: updatedAt, updatedAt, version: 1, payload: { t: id } } as Resource;
}

describe('InMemoryRepository cursor pagination', () => {
  it('renvoie nextCursor et permet de récupérer page suivante', async () => {
    const repo = createInMemoryRepository();
    const base = Date.now();
    // créer 6 ressources avec updatedAt décroissant
    for (let i=0;i<6;i++) {
      await repo.save(make('r'+i, base - i));
    }
    const first = await repo.list('w1', { limit: 3 });
    expect(first.data.length).toBe(3);
    expect(first.nextCursor).toBeTruthy();
    const second = await repo.list('w1', { limit: 3, cursor: first.nextCursor! });
    expect(second.data.length).toBe(3);
    // Pas de troisième page => nextCursor null
    expect(second.nextCursor).toBeNull();
  });
});
