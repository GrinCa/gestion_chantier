import { describe, it, expect } from 'vitest';

// Dynamic import to simulate browser import path

describe('dual export surface', () => {
  it('browser build ne doit pas exposer createSQLiteRepository fonctionnelle', async () => {
    const mod: any = await import('../index.browser.js');
    expect(mod).toHaveProperty('createSQLiteRepository');
    expect(() => mod.createSQLiteRepository()).toThrow();
  });
});
