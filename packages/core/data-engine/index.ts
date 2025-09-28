/**
 * DATA ENGINE - Moteur de données universel
 * ========================================
 * Gestion unifiée des données cross-platform
 * Support offline, sync, cache intelligent
 */

import type {
  DataEntry,
  DataQuery,
  QueryResult,
  Project,
  CreateInput,
  UpdateInput,
  ApiResponse,
  SyncStatus
} from '../types/index.js';
// Event system (optionnel) – noyau
import type { DomainEvent } from '../kernel/events/DomainEvent.js';
import { EventBus, NoopEventBus } from '../kernel/events/EventBus.js';
// Experimental repository integration
import type { ResourceRepository } from '../kernel/repository/ResourceRepository.js';
import type { Resource } from '../kernel/domain/Resource.js';
import { globalDataTypeRegistry } from '../kernel/registry/DataTypeRegistry.js';
// NOTE: EventBus runtime exported via kernel/index, we rely on duck typing ; fallback no-op local if absent
function getNoopBus(): EventBus { return NoopEventBus; }
// ===== STORAGE INTERFACES =====

export interface StorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface NetworkAdapter {
  request<T>(method: string, endpoint: string, data?: any): Promise<ApiResponse<T>>;
  isOnline(): boolean;
  onlineStatusChanged(callback: (online: boolean) => void): void;
}

// ===== MAIN DATA ENGINE =====

export class DataEngine {
  private storage: StorageAdapter;
  private network: NetworkAdapter;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingSync = new Set<string>();
  private eventBus: EventBus;
  private resourceRepo?: ResourceRepository; // expérimental

  constructor(storage: StorageAdapter, network: NetworkAdapter, opts?: { eventBus?: EventBus; resourceRepo?: ResourceRepository }) {
    this.storage = storage;
    this.network = network;
    this.eventBus = opts?.eventBus ?? getNoopBus();
    this.resourceRepo = opts?.resourceRepo;
    
    // Auto-sync when coming online
    this.network.onlineStatusChanged((online) => {
      if (online && this.pendingSync.size > 0) {
        this.syncPendingChanges();
      }
    });
  }

  // ===== PROJECT MANAGEMENT =====

  async createProject(project: CreateInput<Project>): Promise<Project> {
    const id = this.generateId();
    const timestamp = Date.now();
    
    const newProject: Project = {
      id,
      ...project,
      created_at: timestamp,
      updated_at: timestamp
    };

    // Save locally first
    await this.storage.set(`project:${id}`, newProject);
    
    // Try to sync to server
    if (this.network.isOnline()) {
      try {
        const response = await this.network.request<Project>('POST', '/projects', newProject);
        if (response.success && response.data) {
          // Update with server response
          await this.storage.set(`project:${id}`, response.data);
          await this.emitEvent('project', response.data.id, 'created', response.data, response.data.updated_at, project.owner as any);
          return response.data;
        }
      } catch (error) {
        console.warn('Failed to sync project to server, will retry later:', error);
        this.pendingSync.add(`project:${id}`);
      }
    } else {
      this.pendingSync.add(`project:${id}`);
    }
    // Emit local event (offline or pre-sync)
    await this.emitEvent('project', newProject.id, 'created', newProject, newProject.updated_at, (project as any).owner);
    return newProject;
  }

  async getProject(id: string): Promise<Project | null> {
    // Check cache first
    const cached = this.cache.get(`project:${id}`);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Check local storage
    const local = await this.storage.get(`project:${id}`);
    if (local) {
      this.cache.set(`project:${id}`, { data: local, timestamp: Date.now(), ttl: 300000 }); // 5min cache
      return local;
    }

    // Try to fetch from server
    if (this.network.isOnline()) {
      try {
        const response = await this.network.request<Project>('GET', `/projects/${id}`);
        if (response.success && response.data) {
          await this.storage.set(`project:${id}`, response.data);
          this.cache.set(`project:${id}`, { data: response.data, timestamp: Date.now(), ttl: 300000 });
          return response.data;
        }
      } catch (error) {
        console.warn('Failed to fetch project from server:', error);
      }
    }

    return null;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const cacheKey = `user_projects:${userId}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Try server first if online
    if (this.network.isOnline()) {
      try {
        const response = await this.network.request<Project[]>('GET', `/projects?owner=${userId}`);
        if (response.success && response.data) {
          // Cache server response
          this.cache.set(cacheKey, { data: response.data, timestamp: Date.now(), ttl: 60000 }); // 1min cache
          
          // Update local storage for each project
          for (const project of response.data) {
            await this.storage.set(`project:${project.id}`, project);
          }
          
          return response.data;
        }
      } catch (error) {
        console.warn('Failed to fetch projects from server:', error);
      }
    }

    // Fallback to local storage
    const keys = await this.storage.keys();
    const projectKeys = keys.filter(key => key.startsWith('project:'));
    const projects: Project[] = [];
    
    for (const key of projectKeys) {
      const project = await this.storage.get(key);
      if (project && project.owner === userId) {
        projects.push(project);
      }
    }

    return projects.sort((a, b) => b.updated_at - a.updated_at);
  }

  // ===== DATA MANAGEMENT =====

  async createData(projectId: string, dataType: string, content: any, toolOrigin: string): Promise<DataEntry> {
    const id = this.generateId();
    const timestamp = Date.now();

    const entry: DataEntry = {
      id,
      project_id: projectId,
      data_type: dataType,
      content,
      tool_origin: toolOrigin,
      created_at: timestamp
    };

    // Save locally
    await this.storage.set(`data:${id}`, entry);

    // EXPÉRIMENTAL: si repository présent, créer une Resource miroir.
    if (this.resourceRepo) {
      try {
        // Validation unifiée (Zod ou custom) via registre
        try {
          content = globalDataTypeRegistry.validate(dataType, content);
        } catch (e:any) {
          throw new Error(`Validation failed for type ${dataType}: ${e.message}`);
        }
        const descriptor = globalDataTypeRegistry.get(dataType);
        const resource: Resource = {
          id: entry.id,
          type: dataType,
          workspaceId: projectId, // alias projet -> workspace (futur renommage)
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
          origin: toolOrigin,
          payload: content,
          schemaVersion: descriptor?.schemaVersion
        };
        await this.resourceRepo.save(resource);
      } catch (err) {
        console.warn('[DataEngine] resourceRepo mirror save failed', err);
      }
    }
    
    // Update project's updated_at
    const project = await this.getProject(projectId);
    if (project) {
      project.updated_at = timestamp;
      await this.storage.set(`project:${projectId}`, project);
      await this.emitEvent('project', project.id, 'updated', { updated_at: project.updated_at }, project.updated_at);
    }

    // Try to sync
    if (this.network.isOnline()) {
      try {
        const response = await this.network.request<DataEntry>('POST', `/projects/${projectId}/data`, entry);
        if (response.success && response.data) {
          await this.storage.set(`data:${id}`, response.data);
          await this.emitEvent('data', response.data.id, 'created', response.data, response.data.created_at, response.data.tool_origin);
          return response.data;
        }
      } catch (error) {
        console.warn('Failed to sync data to server:', error);
        this.pendingSync.add(`data:${id}`);
      }
    } else {
      this.pendingSync.add(`data:${id}`);
    }
    await this.emitEvent('data', entry.id, 'created', entry, entry.created_at, toolOrigin);
    return entry;
  }

  async queryData(query: DataQuery): Promise<QueryResult<DataEntry>> {
    const { project_id } = query;

    // Try server first if online
    if (this.network.isOnline()) {
      try {
        const response = await this.network.request<QueryResult<DataEntry>>('POST', `/projects/${project_id}/query`, query);
        if (response.success && response.data) {
          // Cache results locally
          for (const entry of response.data.data) {
            await this.storage.set(`data:${entry.id}`, entry);
          }
          return response.data;
        }
      } catch (error) {
        console.warn('Failed to query server, falling back to local data:', error);
      }
    }

    // Fallback to local query
    return this.queryLocalData(query);
  }

  private async queryLocalData(query: DataQuery): Promise<QueryResult<DataEntry>> {
    const { project_id, data_types, filters, sort, limit = 100, offset = 0 } = query;
    
    const keys = await this.storage.keys();
    const dataKeys = keys.filter(key => key.startsWith('data:'));
    let results: DataEntry[] = [];

    for (const key of dataKeys) {
      const entry = await this.storage.get(key);
      if (!entry || entry.project_id !== project_id) continue;
      
      // Filter by data types
      if (data_types && !data_types.includes(entry.data_type)) continue;
      
      // Apply filters
      if (filters && !this.matchesFilters(entry, filters)) continue;
      
      results.push(entry);
    }

    // Sort results
    if (sort) {
      results.sort((a, b) => {
        for (const sortRule of sort) {
          const aVal = this.getNestedValue(a, sortRule.field);
          const bVal = this.getNestedValue(b, sortRule.field);
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          if (comparison !== 0) {
            return sortRule.direction === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    // Pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      data: paginatedResults,
      total,
      has_more: offset + limit < total
    };
  }

  // ===== SYNC MANAGEMENT =====

  async syncPendingChanges(): Promise<void> {
    if (!this.network.isOnline()) return;

    const pending = Array.from(this.pendingSync);
    const failed = new Set<string>();

    for (const key of pending) {
      try {
        const data = await this.storage.get(key);
        if (!data) {
          this.pendingSync.delete(key);
          continue;
        }

        let response;
        if (key.startsWith('project:')) {
          response = await this.network.request('POST', '/projects', data);
        } else if (key.startsWith('data:')) {
          response = await this.network.request('POST', `/projects/${data.project_id}/data`, data);
        }

        if (response?.success) {
          this.pendingSync.delete(key);
          const synced: any = response.data;
          if (synced) {
            await this.storage.set(key, synced);
            if (key.startsWith('project:') && synced.id) {
              await this.emitEvent('project', synced.id, 'synced', synced, synced.updated_at ?? Date.now());
            } else if (key.startsWith('data:') && synced.id) {
              await this.emitEvent('data', synced.id, 'synced', synced, synced.created_at ?? Date.now());
            }
          }
        } else {
          failed.add(key);
        }
      } catch (error) {
        console.warn(`Failed to sync ${key}:`, error);
        failed.add(key);
      }
    }

    // Keep failed items for retry
    this.pendingSync = failed;
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return {
      last_sync: Date.now(), // TODO: Track actual last sync
      pending_changes: this.pendingSync.size,
      conflicts: [], // TODO: Implement conflict detection
      status: this.pendingSync.size === 0 ? 'synced' : 'pending'
    };
  }

  // ===== UTILITY METHODS =====

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  private matchesFilters(_entry: DataEntry, _filters: any[]): boolean {
    // TODO: Implement sophisticated filtering
    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // ===== EVENT EMISSION =====
  private async emitEvent(entityType: string, entityId: string, operation: string, payload: any, timestamp: number, actor?: string) {
    try {
      const evt: DomainEvent = {
        id: this.generateId(),
        entityType,
        entityId,
        operation,
        timestamp,
        payload,
        actor
      };
      // @ts-ignore if eventBus has no emit signature at runtime fallback silent
      await this.eventBus.emit(evt);
    } catch (e) {
      // Ne jamais faire échouer une écriture à cause de la couche d'observation
      console.warn('[DataEngine] Event emission failed', e);
    }
  }

  // ===== CLEANUP =====

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async clearLocalData(): Promise<void> {
    await this.storage.clear();
    this.cache.clear();
    this.pendingSync.clear();
  }
}