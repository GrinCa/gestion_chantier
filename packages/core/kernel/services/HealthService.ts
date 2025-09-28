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
}

export class HealthService {
  private repo: ResourceRepository;
  private metrics?: MetricsService;
  private migrations?: MigrationService;
  constructor(repo: ResourceRepository, metrics?: MetricsService, migrations?: MigrationService) {
    this.repo = repo;
    this.metrics = metrics;
    this.migrations = migrations;
  }

  async snapshot(workspaceId: string, syncProvider?: ()=>Promise<any>): Promise<HealthSnapshot> {
    const ts = Date.now();
    const snap: HealthSnapshot = { timestamp: ts, ok: true, notes: [] };
    if (syncProvider) {
      try { snap.sync = await syncProvider(); } catch (e:any) { snap.notes?.push('sync:error'); snap.ok = false; }
    }
    if (this.metrics) {
      try { snap.metrics = this.metrics.snapshot(); } catch (e:any) { snap.notes?.push('metrics:error'); snap.ok = false; }
    }
    if (this.migrations) {
      try { snap.migrations = await this.migrations.pendingMigrations(workspaceId); } catch (e:any) { snap.notes?.push('migrations:error'); }
    }
    return snap;
  }
}
