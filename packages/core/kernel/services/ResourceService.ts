/**
 * ResourceService.ts
 * ---------------------------------------------------------------------------
 * Service applicatif léger autour des Resources : création / mise à jour
 * avec validation, versioning et émission d'événements.
 */
import { globalDataTypeRegistry } from '../registry/DataTypeRegistry.js';
import type { Resource } from '../domain/Resource.js';
import type { ResourceRepository } from '../repository/ResourceRepository.js';
import type { EventBus } from '../events/EventBus.js';
import type { DomainEvent } from '../events/DomainEvent.js';
import type { AccessPolicy } from '../auth/AccessPolicy.js';

export interface ResourceCreateInput<T = any> {
  type: string;
  workspaceId: string;
  payload: T;
  origin?: string;
  metadata?: Record<string, any>;
}

export interface ResourceUpdateInput<T = any> {
  payload?: Partial<T> | ((prev: T) => T);
  metadata?: Record<string, any>;
  origin?: string;
  expectedVersion?: number; // for optimistic locking
}

export class ResourceService {
  private repo: ResourceRepository;
  private events: EventBus;
  private policy?: AccessPolicy;
  constructor(repo: ResourceRepository, events: EventBus, policy?: AccessPolicy) {
    this.repo = repo;
    this.events = events;
    this.policy = policy;
  }

  private now() { return Date.now(); }
  private id() { return this.now().toString(36) + Math.random().toString(36).slice(2); }

  async create<T = any>(input: ResourceCreateInput<T>): Promise<Resource<T>> {
    if (this.policy && !(await this.policy.can('resource:create', { workspaceId: input.workspaceId, resourceType: input.type }))) {
      throw new Error('Access denied: resource:create');
    }
    const validated = globalDataTypeRegistry.validate(input.type, input.payload);
    const descriptor = globalDataTypeRegistry.get(input.type);
    const ts = this.now();
    const resource: Resource<T> = {
      id: this.id(),
      type: input.type,
      workspaceId: input.workspaceId,
      createdAt: ts,
      updatedAt: ts,
      version: 1,
      origin: input.origin,
      payload: validated,
      schemaVersion: descriptor?.schemaVersion,
      metadata: input.metadata
    };
    await this.repo.save(resource);
    await this.emit('resource', resource.id, 'created', resource, ts, resource.origin, resource.version);
    return resource;
  }

  async update<T = any>(id: string, mutate: ResourceUpdateInput<T>): Promise<Resource<T>> {
    const existing = await this.repo.get(id) as Resource<T> | null;
    if (!existing) throw new Error(`Resource not found: ${id}`);
    if (this.policy && !(await this.policy.can('resource:update', { workspaceId: existing.workspaceId, resourceType: existing.type }))) {
      throw new Error('Access denied: resource:update');
    }
    if (mutate.expectedVersion && existing.version !== mutate.expectedVersion) {
      // Emit conflict event and return existing unchanged
      await this.emit('resource', existing.id, 'conflict', { expected: mutate.expectedVersion, actual: existing.version }, Date.now(), mutate.origin || existing.origin, existing.version);
      throw new Error(`Version conflict for resource ${id}: expected ${mutate.expectedVersion} got ${existing.version}`);
    }
    const descriptor = globalDataTypeRegistry.get(existing.type);
    let newPayload = existing.payload;
    if (mutate.payload) {
      newPayload = typeof mutate.payload === 'function'
        ? (mutate.payload as any)(existing.payload)
        : { ...existing.payload, ...mutate.payload };
      newPayload = globalDataTypeRegistry.validate(existing.type, newPayload);
    }
    const ts = this.now();
    const updated: Resource<T> = {
      ...existing,
      payload: newPayload,
      metadata: mutate.metadata ? { ...(existing.metadata||{}), ...mutate.metadata } : existing.metadata,
      updatedAt: ts,
      version: (existing.version ?? 1) + 1,
      origin: mutate.origin || existing.origin,
      schemaVersion: descriptor?.schemaVersion
    };
    await this.repo.save(updated);
    await this.emit('resource', updated.id, 'updated', { diff: !!mutate.payload, metadata: !!mutate.metadata }, ts, updated.origin, updated.version);
    return updated;
  }

  /**
   * Supprime une resource et émet un événement `resource.deleted`.
   * Retourne la resource supprimée (snapshot) pour usage éventuel.
   */
  async delete(id: string, origin?: string): Promise<Resource | null> {
    const existing = await this.repo.get(id);
    if (!existing) return null;
    if (this.policy && !(await this.policy.can('resource:delete', { workspaceId: existing.workspaceId, resourceType: existing.type }))) {
      throw new Error('Access denied: resource:delete');
    }
    await this.repo.delete(id);
    const ts = this.now();
    await this.emit('resource', existing.id, 'deleted', { previousVersion: existing.version }, ts, origin || existing.origin, existing.version);
    return existing;
  }

  private async emit(entityType: string, entityId: string, operation: string, payload: any, timestamp: number, actor?: string, version?: number) {
    const evt: DomainEvent = { id: this.id(), entityType, entityId, operation, timestamp, payload, actor, version };
    try { await this.events.emit(evt); } catch (e) { console.warn('[ResourceService] event emit failed', e); }
  }
}
