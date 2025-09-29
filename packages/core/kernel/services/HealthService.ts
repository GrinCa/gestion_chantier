/**
 * HealthService.ts
 * ---------------------------------------------------------------------------
 * Fournit un snapshot agrégé (santé) combinant sync, metrics, migrations.
 */
import type { MetricsService } from './MetricsService.js';
import type { MigrationService } from './MigrationService.js';
import type { ResourceRepository } from '../repository/ResourceRepository.js';

export interface HealthSnapshot {
  timestamp: number;
  ok: boolean;
  sync?: any;
  metrics?: any;
  migrations?: { total: number; byType: Record<string, { outdated: number; targetVersion: number }> };
  notes?: string[];
  repositoryLatency?: any;
  exports?: any;
  accessDenied?: any;
  imports?: any;
  migrationsRun?: any;
  eventErrors?: number;
}

export class HealthService {
  constructor(
    private repo: ResourceRepository,
    private metrics?: MetricsService,
    private migrations?: MigrationService
  ){}

  async snapshot(workspaceId: string, syncProvider?: ()=>Promise<any>): Promise<HealthSnapshot> {
    const ts = Date.now();
    const snap: HealthSnapshot = { timestamp: ts, ok: true, notes: [] };
    if (syncProvider) {
      try { snap.sync = await syncProvider(); } catch (e:any) { snap.notes?.push('sync:error'); snap.ok = false; }
    }
    if (this.metrics) {
      try {
        const m = this.metrics.snapshot();
        snap.metrics = {
          events: m.events,
          toolExec: m.toolExec, // contient maintenant avg, p50, p95
          indexSize: m.indexSize
        };
        if (m.repository) snap.repositoryLatency = m.repository;
        if (m.export) snap.exports = m.export;
        if (m.import) snap.imports = m.import;
        if (m.accessDenied) snap.accessDenied = m.accessDenied;
        if (m.migration) snap.migrationsRun = m.migration;
        if (m.eventErrors) snap.eventErrors = m.eventErrors;
      } catch (e:any) { snap.notes?.push('metrics:error'); snap.ok = false; }
    }
    if (this.migrations) {
      try { snap.migrations = await this.migrations.pendingMigrations(workspaceId); } catch (e:any) { snap.notes?.push('migrations:error'); }
    }
    return snap;
  }
}
