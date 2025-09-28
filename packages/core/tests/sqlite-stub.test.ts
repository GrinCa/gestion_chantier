import { describe, it, expect } from 'vitest';
import * as browser from '../index.browser.js';

describe('sqlite stub browser', () => {
  it('lève une erreur explicite', () => {
    expect(() => (browser as any).createSQLiteRepository()).toThrow(/indisponible/);
  });
});
