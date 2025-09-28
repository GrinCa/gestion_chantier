import { Router } from 'express';
// Expect injected services from caller for loose coupling
export function createObservabilityRouter({ metricsService, healthService }) {
  const r = Router();
  r.get('/metrics', (_req, res) => {
    try { res.json(metricsService.snapshot()); } catch (e) { res.status(500).json({ error: 'metrics_error', message: String(e) }); }
  });
  r.get('/health', async (req, res) => {
    const workspaceId = req.query.workspaceId || 'default';
    try { res.json(await healthService.snapshot(String(workspaceId))); } catch (e) { res.status(500).json({ error: 'health_error', message: String(e) }); }
  });
  return r;
}
