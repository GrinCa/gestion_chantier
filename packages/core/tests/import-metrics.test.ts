import { describe, it, expect } from 'vitest';
import { MetricsService } from '../kernel/services/MetricsService.js';
import { ImportService } from '../kernel/services/ImportService.js';
import { EventBus } from '../kernel/events/EventBus.js';

describe('import metrics', () => {
  it('records import stats (success + errors)', () => {
    const bus = new EventBus();
    const metrics = new MetricsService(bus as any);
    const svc = new ImportService(metrics);
    const manifest = { count: 2, types: { doc: 2 } };
    const ndjson = [
      JSON.stringify({ id: 'a', type: 'doc' }),
      '{ invalid json',
    ].join('\n');
    const res = svc.validateNdjson(manifest, ndjson);
    expect(res.success).toBe(false);
    const snap = metrics.snapshot();
    expect(snap.import?.total).toBe(1);
    expect(snap.import?.resources).toBe(2);
    expect(snap.import?.errors).toBeGreaterThan(0);
  });
});
