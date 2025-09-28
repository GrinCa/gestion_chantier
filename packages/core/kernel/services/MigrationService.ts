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

export interface MigrationResult {
  migrated: number;
  touchedIds: string[];
}

export class MigrationService {
  constructor(private repo: ResourceRepository) {}

  /**
   * Parcours toutes les resources d'un workspace et tente une migration
   * si leur `schemaVersion` est < à celle déclarée.
   */
  async migrateWorkspace(workspaceId: string): Promise<MigrationResult> {
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
    return { migrated, touchedIds: touched };
  }
}
