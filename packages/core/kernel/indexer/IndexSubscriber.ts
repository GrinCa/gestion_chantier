/**
 * IndexSubscriber.ts
 * ---------------------------------------------------------------------------
 * Abonné aux événements DomainEvent pour maintenir l'index à jour.
 * Écoute: resource.created | resource.updated | resource.deleted (futur)
 */
import type { EventBus } from '../events/EventBus.js';
import type { ResourceRepository } from '../repository/ResourceRepository.js';
import type { Indexer } from './Indexer.js';

export class IndexSubscriber {
  constructor(private bus: EventBus, private repo: ResourceRepository, private indexer: Indexer) {}

  attach() {
    this.bus.on('created', (e) => this.handle(e.entityType, e.entityId));
    this.bus.on('updated', (e) => this.handle(e.entityType, e.entityId));
    // deletion plus tard
  }

  private async handle(entityType: string, id: string) {
    if (entityType !== 'resource') return;
    const res = await this.repo.get(id);
    if (!res) return;
    try {
      await this.indexer.index(res);
    } catch (err) {
      console.warn('[IndexSubscriber] index error', err);
    }
  }
}
