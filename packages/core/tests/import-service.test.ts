import { describe, it, expect } from 'vitest';
import { ImportService } from '../kernel/services/ImportService.js';

const svc = new ImportService();

describe('ImportService validation', () => {
  it('valide un export cohérent', () => {
    const manifest = { count: 2, types: { note: 2 } };
    const ndjson = JSON.stringify({ id: 'a', type: 'note' }) + '\n' + JSON.stringify({ id: 'b', type: 'note' });
    const res = svc.validateNdjson(manifest, ndjson);
    expect(res.success).toBe(true);
    expect(res.issues.length).toBe(0);
  });

  it('détecte incohérences manifest et duplications', () => {
    const manifest = { count: 4, types: { note: 3 } }; // count volontairement différent
    const ndjson = [
      JSON.stringify({ id: 'x', type: 'note' }),
      JSON.stringify({ id: 'x', type: 'note' }), // duplicate
      '{ invalid json', // parse error
    ].join('\n');
    const res = svc.validateNdjson(manifest, ndjson);
    expect(res.success).toBe(false);
    const codes = res.issues.map(i=> i.code);
    expect(codes).toContain('COUNT_MISMATCH');
    expect(codes).toContain('JSON_PARSE');
    expect(codes).toContain('DUPLICATE_ID');
  });
});
