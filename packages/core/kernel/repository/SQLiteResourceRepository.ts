/**
 * SQLiteResourceRepository.ts (stub initial)
 * ---------------------------------------------------------------------------
 * Implémentation expérimentale d'un ResourceRepository persistant via sqlite3.
 * Version Lite: opérations basiques get/save/delete/list (liste sans filtres avancés au début).
 */
import type { Resource } from '../domain/Resource.js';
import type { QueryOptions, ResourceListResult, ResourceRepository } from './ResourceRepository.js';
import sqlite3 from 'sqlite3';

export interface SQLiteResourceRepositoryOptions {
  filename?: string;
}

export class SQLiteResourceRepository implements ResourceRepository {
  private db: sqlite3.Database;
  constructor(opts?: SQLiteResourceRepositoryOptions){
    this.db = new sqlite3.Database(opts?.filename || ':memory:');
    this.init();
  }
  private init(){
    this.db.serialize(()=>{
      this.db.run(`CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        version INTEGER NOT NULL,
        origin TEXT,
        schema_version INTEGER,
        metadata TEXT,
        payload TEXT
      )`);
    });
  }
  async get(id: string): Promise<Resource | null> {
    return new Promise((resolve, reject)=>{
      this.db.get('SELECT * FROM resources WHERE id=?', [id], (err,row)=>{
        if(err) return reject(err);
        if(!row) return resolve(null);
        resolve(this.rowToResource(row));
      });
    });
  }
  async list(workspaceId: string, _query?: QueryOptions): Promise<ResourceListResult> {
    return new Promise((resolve,reject)=>{
      this.db.all('SELECT * FROM resources WHERE workspace_id=?', [workspaceId], (err, rows)=>{
        if(err) return reject(err);
        const data = rows.map(r=> this.rowToResource(r));
        resolve({ data, total: data.length });
      });
    });
  }
  async save(resource: Resource): Promise<Resource> {
    return new Promise((resolve,reject)=>{
      this.db.run(`INSERT OR REPLACE INTO resources (id,type,workspace_id,created_at,updated_at,version,origin,schema_version,metadata,payload)
        VALUES (?,?,?,?,?,?,?,?,?,?)`, [
          resource.id, resource.type, resource.workspaceId, resource.createdAt, resource.updatedAt, resource.version,
          resource.origin || null, resource.schemaVersion || null, JSON.stringify(resource.metadata||null), JSON.stringify(resource.payload)
        ], err=>{
          if(err) return reject(err);
          resolve(resource);
        });
    });
  }
  async delete(id: string): Promise<void> {
    return new Promise((resolve,reject)=>{
      this.db.run('DELETE FROM resources WHERE id=?', [id], err=>{ if(err) reject(err); else resolve(); });
    });
  }
  private rowToResource(row: any): Resource {
    return {
      id: row.id,
      type: row.type,
      workspaceId: row.workspace_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      origin: row.origin || undefined,
      schemaVersion: row.schema_version || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      payload: row.payload ? JSON.parse(row.payload) : undefined
    };
  }
}

export const createSQLiteRepository = (opts?: SQLiteResourceRepositoryOptions) => new SQLiteResourceRepository(opts);