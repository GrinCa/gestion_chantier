import { describe, it, expect } from 'vitest';

import * as browser from '../index.browser.js';

describe('ExportService browser stub', () => {
  it('lance erreur explicite', () => {
    expect(() => (browser as any).ExportService && new (browser as any).ExportService()).toThrow(/indisponible/);
  });
});
