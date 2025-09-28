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
  private bus: EventBus;
  private repo: ResourceRepository;
  private indexer: Indexer;
  constructor(bus: EventBus, repo: ResourceRepository, indexer: Indexer) {
    this.bus = bus;
    this.repo = repo;
    this.indexer = indexer;
  }

  attach() {
    this.bus.on('created', (e) => this.handle(e.entityType, e.entityId));
    this.bus.on('updated', (e) => this.handle(e.entityType, e.entityId));
    this.bus.on('deleted', (e) => this.handleDeletion(e.entityType, e.entityId));
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

  private async handleDeletion(entityType: string, id: string) {
    if (entityType !== 'resource') return;
    try {
      await this.indexer.remove(id);
    } catch (err) {
      console.warn('[IndexSubscriber] remove error', err);
    }
  }
}
