/**
 * DataEngineBridge.ts
 * ---------------------------------------------------------------------------
 * Pont temporaire entre l'ancienne DataEngine (projects/data) et le nouveau
 * ResourceRepository. Objectif : peupler progressivement le repository lors
 * des créations de data (data.created) sans refactor immédiat profond.
 */
import type { EventBus } from '../events/EventBus.js';
import type { DomainEvent } from '../events/DomainEvent.js';
import type { Resource } from '../domain/Resource.js';
import type { ResourceRepository } from '../repository/ResourceRepository.js';

export interface DataEngineBridgeOptions {
  eventBus: EventBus;
  repository: ResourceRepository;
  workspaceAlias?: (projectId: string) => string; // futur alias (Project->Workspace)
}

export class DataEngineBridge {
  constructor(private opts: DataEngineBridgeOptions) {}

  /** Branche les handlers nécessaires. */
  attach() {
    this.opts.eventBus.on('created', (e) => this.handle(e));
  }

  private async handle(event: DomainEvent) {
    if (event.entityType !== 'data' || event.operation !== 'created') return;
    const payload: any = event.payload;
    // Structure attendue: DataEntry
    const workspaceId = this.opts.workspaceAlias ? this.opts.workspaceAlias(payload.project_id) : payload.project_id;
    const resource: Resource = {
      id: payload.id,
      type: payload.data_type,
      workspaceId,
      createdAt: payload.created_at || event.timestamp,
      updatedAt: payload.created_at || event.timestamp,
      version: 1,
      origin: payload.tool_origin,
      payload: payload.content
    };
    try {
      await this.opts.repository.save(resource);
    } catch (err) {
      // Log silencieux pour ne pas impacter flux principal
      console.warn('[DataEngineBridge] save failed', err);
    }
  }
}
