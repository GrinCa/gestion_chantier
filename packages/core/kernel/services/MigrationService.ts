/**
 * MigrationService.ts
 * ---------------------------------------------------------------------------
 * Service chargé d'orchestrer l'upgrade des Resources dont le payload a une
 * version de schéma antérieure à la version courante déclarée dans le
 * DataTypeRegistry. S'appuie sur la fonction `migrate` des descriptors.
 */
import { globalDataTypeRegistry } from '../registry/DataTypeRegistry.js';
import type { Resource } from '../domain/Resource.js';
import type { ResourceRepository } from '../repository/ResourceRepository.js';
import type { MetricsService } from './MetricsService.js';

export interface MigrationResult {
  migrated: number;
  touchedIds: string[];
}

export class MigrationService {
  constructor(private repo: ResourceRepository, private metrics?: MetricsService) {}

  /**
   * Parcours toutes les resources d'un workspace et tente une migration
   * si leur `schemaVersion` est < à celle déclarée.
   */
  async migrateWorkspace(workspaceId: string): Promise<MigrationResult> {
  const start = Date.now();
  const page = await this.repo.list(workspaceId, { limit: 10000 });
    let migrated = 0; const touched: string[] = [];
    for (const res of page.data) {
      const desc = globalDataTypeRegistry.get(res.type);
      if (!desc) continue;
      if (desc.schemaVersion == null) continue;
      const current = res.schemaVersion ?? desc.schemaVersion; // fallback
      if (current >= desc.schemaVersion) continue; // up to date
      if (!desc.migrate) continue;
      const upgradedPayload = desc.migrate(res.payload, current);
      res.payload = upgradedPayload;
      res.schemaVersion = desc.schemaVersion;
      res.version = (res.version ?? 1) + 1;
      res.updatedAt = Date.now();
      await this.repo.save(res as Resource);
      migrated++; touched.push(res.id);
    }
    this.metrics?.recordMigration(touched.length, Date.now()-start);
    return { migrated, touchedIds: touched };
  }

  /**
   * Retourne un résumé des migrations en attente pour un workspace.
   * Renvoie { total, byType: { [type]: { outdated: number; targetVersion: number } } }
   */
  async pendingMigrations(workspaceId: string): Promise<{ total: number; byType: Record<string, { outdated: number; targetVersion: number }> }> {
    const page = await this.repo.list(workspaceId, { limit: 10000 });
    const acc: Record<string, { outdated: number; targetVersion: number }> = {};
    let total = 0;
    for (const res of page.data) {
      const desc = globalDataTypeRegistry.get(res.type);
      if (!desc || desc.schemaVersion == null) continue;
      const current = res.schemaVersion ?? desc.schemaVersion;
      if (current >= desc.schemaVersion) continue;
      if (!acc[res.type]) acc[res.type] = { outdated: 0, targetVersion: desc.schemaVersion };
      acc[res.type].outdated++;
      total++;
    }
    return { total, byType: acc };
  }
}
