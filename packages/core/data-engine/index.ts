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
  Workspace,
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
import type { Indexer } from '../kernel/indexer/Indexer.js';
import { MigrationService } from '../kernel/services/MigrationService.js';
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
  private indexer?: Indexer; // enrichissement sync status
  private migrationService?: MigrationService;
  private lastEventTimestamp: number | null = null;
  private conflicts: Array<{ id: string; expected: number; actual: number; at: number }> = [];

  constructor(storage: StorageAdapter, network: NetworkAdapter, opts?: { eventBus?: EventBus; resourceRepo?: ResourceRepository; indexer?: Indexer; migrationService?: MigrationService }) {
    this.storage = storage;
    this.network = network;
    this.eventBus = opts?.eventBus ?? getNoopBus();
    this.resourceRepo = opts?.resourceRepo;
    this.indexer = opts?.indexer;
    this.migrationService = opts?.migrationService;
    // Listen for conflict events if eventBus provided
    this.eventBus.on?.('*', (e: any) => {
      if (e.entityType === 'resource' && e.operation === 'conflict') {
        const { expected, actual } = e.payload || {};
        this.conflicts.push({ id: e.entityId, expected, actual, at: e.timestamp });
        if (this.conflicts.length > 50) this.conflicts.shift(); // cap memory
      }
    });
    
    // Auto-sync when coming online
    this.network.onlineStatusChanged((online) => {
      if (online && this.pendingSync.size > 0) {
        this.syncPendingChanges();
      }
    });
  }

  // ===== PROJECT MANAGEMENT =====

  // NEW canonical API
  async createWorkspace(workspace: CreateInput<Workspace>): Promise<Workspace> {
    const id = this.generateId();
    const timestamp = Date.now();
    const newWorkspace: Workspace = {
      id,
      ...workspace,
      created_at: timestamp,
      updated_at: timestamp
    };
    await this.storage.set(`project:${id}`, newWorkspace);
    
    // Try to sync to server
    if (this.network.isOnline()) {
      try {
        const response = await this.network.request<Workspace>('POST', '/workspaces', newWorkspace);
        if (response.success && response.data) {
          // Update with server response
          await this.storage.set(`project:${id}`, response.data);
          await this.emitEvent('workspace', response.data.id, 'created', response.data, response.data.updated_at, (workspace as any).owner);
          return response.data;
        }
      } catch (error) {
        console.warn('Failed to sync project to server, will retry later:', error);
        this.pendingSync.add(`project:${id}`);
      }
    } else {
      this.pendingSync.add(`project:${id}`);
    }
    await this.emitEvent('workspace', newWorkspace.id, 'created', newWorkspace, newWorkspace.updated_at, (workspace as any).owner);
    return newWorkspace;
  }

  // Backward compatibility wrapper (deprecated)
  /**
   * @deprecated Use createWorkspace() instead. Will be removed in a future major version.
   */
  async createProject(project: CreateInput<Project>): Promise<Project> { return this.createWorkspace(project as any as CreateInput<Workspace>) as any; }

  async getWorkspace(id: string): Promise<Workspace | null> {
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

    // Try to fetch from server (workspace endpoint)
    if (this.network.isOnline()) {
      try {
        const response = await this.network.request<Workspace>('GET', `/workspaces/${id}`);
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

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const cacheKey = `user_workspaces:${userId}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Try server first if online
    if (this.network.isOnline()) {
      try {
  const response = await this.network.request<Workspace[]>('GET', `/workspaces?owner=${userId}`);
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
  const projectKeys = keys.filter(key => key.startsWith('project:'));// keeping key prefix for compatibility
  const workspaces: Workspace[] = [];
    
    for (const key of projectKeys) {
      const project = await this.storage.get(key);
      if (project && project.owner === userId) {
        workspaces.push(project);
      }
    }
    return workspaces.sort((a, b) => b.updated_at - a.updated_at);
  }

  // Deprecated wrappers
  /** @deprecated Use getWorkspace() */
  async getProject(id: string): Promise<Project | null> { return this.getWorkspace(id) as any; }
  /** @deprecated Use getUserWorkspaces() */
  async getUserProjects(userId: string): Promise<Project[]> { return this.getUserWorkspaces(userId) as any; }

  // ===== DATA MANAGEMENT =====

  async createData(projectId: string, dataType: string, content: any, toolOrigin: string): Promise<DataEntry> {
    const id = this.generateId();
    const timestamp = Date.now();
    // Validation avant toute écriture locale
    let validated = content;
    try {
      validated = globalDataTypeRegistry.validate(dataType, content);
    } catch (e: any) {
      throw new Error(`Validation failed for type ${dataType}: ${e.message}`);
    }

    const entry: DataEntry = {
      id,
      workspace_id: projectId,
      project_id: projectId, // legacy mirror
      data_type: dataType,
      content: validated,
      tool_origin: toolOrigin,
      created_at: timestamp
    };

    // Persist local après validation
    await this.storage.set(`data:${id}`, entry);

    // Mirroring Resource (expérimental) si repo présent
    if (this.resourceRepo) {
      const descriptor = globalDataTypeRegistry.get(dataType);
      const resource: Resource = {
        id: entry.id,
        type: dataType,
        workspaceId: projectId,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
        origin: toolOrigin,
        payload: validated,
        schemaVersion: descriptor?.schemaVersion
      };
      await this.resourceRepo.save(resource);
    }
    
    // Update project's updated_at
    const workspace = await this.getWorkspace(projectId);
    if (workspace) {
      workspace.updated_at = timestamp;
      await this.storage.set(`project:${projectId}`, workspace);
      await this.emitEvent('workspace', workspace.id, 'updated', { updated_at: workspace.updated_at }, workspace.updated_at);
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
    const project_id = query.workspace_id || query.project_id; // support the two during migration
    if (!project_id) throw new Error('queryData: workspace_id (or legacy project_id) requis');

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
    const project_id = query.workspace_id || query.project_id;
    const { data_types, filters, sort, limit = 100, offset = 0 } = query;
    if (!project_id) throw new Error('queryLocalData: workspace_id (ou legacy project_id) requis');
    
    const keys = await this.storage.keys();
    const dataKeys = keys.filter(key => key.startsWith('data:'));
    let results: DataEntry[] = [];

    for (const key of dataKeys) {
      const entry = await this.storage.get(key);
  if (!entry || (entry.workspace_id || entry.project_id) !== project_id) continue;
      
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
    let migrationsPending: number | undefined;
    let migrationsByType: Record<string, any> | undefined;
    if (this.migrationService && this.resourceRepo) {
      try {
        const workspaceIds = new Set<string>();
        const keys = await this.storage.keys();
        for (const k of keys) if (k.startsWith('project:')) { const p = await this.storage.get(k); if (p?.id) workspaceIds.add(p.id); }
        let total = 0; const byTypeAgg: Record<string, { outdated: number; targetVersion: number }> = {};
        for (const ws of workspaceIds) {
          const pending = await this.migrationService.pendingMigrations(ws);
          total += pending.total;
          for (const [t, info] of Object.entries(pending.byType)) {
            if (!byTypeAgg[t]) byTypeAgg[t] = { outdated: 0, targetVersion: info.targetVersion };
            byTypeAgg[t].outdated += info.outdated;
          }
        }
        migrationsPending = total;
        migrationsByType = byTypeAgg;
      } catch {/* ignore */}
    }
    const indexSize = this.indexer?.size();
    return {
      last_sync: Date.now(),
      pending_changes: this.pendingSync.size,
      conflicts: this.conflicts,
      status: this.pendingSync.size === 0 ? 'synced' : 'pending',
      // extensions internes (non standardisées encore)
      // @ts-ignore
      index_size: indexSize,
      // @ts-ignore
      last_event_at: this.lastEventTimestamp,
      // @ts-ignore
      migrations_pending: migrationsPending,
      // @ts-ignore
      migrations_by_type: migrationsByType
    } as any;
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
      this.lastEventTimestamp = evt.timestamp;
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