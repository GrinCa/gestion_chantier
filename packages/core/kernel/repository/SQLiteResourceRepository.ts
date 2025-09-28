/**
 * SQLiteResourceRepository.ts (stub initial)
 * ---------------------------------------------------------------------------
 * Implémentation expérimentale d'un ResourceRepository persistant via sqlite3.
 * Version Lite: opérations basiques get/save/delete/list (liste sans filtres avancés au début).
 */
import type { Resource } from '../domain/Resource.js';
import type { QueryOptions, ResourceListResult, ResourceRepository, QueryFilter } from './ResourceRepository.js';
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
  async list(workspaceId: string, query?: QueryOptions): Promise<ResourceListResult> {
    const q = query || {};
    const where: string[] = ['workspace_id = ?'];
    const params: any[] = [workspaceId];

    // Filter by types
    if (q.types && q.types.length) {
      where.push(`type IN (${q.types.map(()=> '?').join(',')})`);
      params.push(...q.types);
    }

    // Generic filters (limited translation)
    if (q.filter && q.filter.length) {
      for (const f of q.filter) {
        // Map known top-level fields
        if (f.field === 'updatedAt' || f.field === 'updated_at') {
          if (f.op === 'gt') { where.push('updated_at > ?'); params.push(f.value); }
          else if (f.op === 'lt') { where.push('updated_at < ?'); params.push(f.value); }
          else if (f.op === 'eq') { where.push('updated_at = ?'); params.push(f.value); }
        } else if (f.field === 'createdAt' || f.field === 'created_at') {
          if (f.op === 'gt') { where.push('created_at > ?'); params.push(f.value); }
          else if (f.op === 'lt') { where.push('created_at < ?'); params.push(f.value); }
          else if (f.op === 'eq') { where.push('created_at = ?'); params.push(f.value); }
        } else if (f.field === 'type') {
          if (f.op === 'eq') { where.push('type = ?'); params.push(f.value); }
          else if (f.op === 'in' && Array.isArray(f.value)) { where.push(`type IN (${f.value.map(()=> '?').join(',')})`); params.push(...f.value); }
        } else if (f.op === 'contains') {
          // Fallback naive JSON LIKE search across payload and metadata
            where.push('(payload LIKE ? OR metadata LIKE ?)');
            const needle = `%${String(f.value)}%`;
            params.push(needle, needle);
        }
        // Other ops ignored for now (could extend JSON1 usage)
      }
    }

    // Simple full-text fallback (LIKE on payload/metadata)
    if (q.fullText) {
      where.push('(payload LIKE ? OR metadata LIKE ? OR type LIKE ?)');
      const like = `%${q.fullText}%`;
      params.push(like, like, like);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const limit = q.limit && q.limit > 0 ? q.limit : 50;
    const offset = q.offset && q.offset > 0 ? q.offset : 0;

    const orderClause = q.sort && q.sort.length
      ? 'ORDER BY ' + q.sort.map(s => {
          const col = (s.field === 'updatedAt') ? 'updated_at' : (s.field === 'createdAt') ? 'created_at' : s.field;
          return `${col} ${s.dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
        }).join(',')
      : 'ORDER BY updated_at DESC';

    const sqlData = `SELECT * FROM resources ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const sqlCount = `SELECT COUNT(*) as c FROM resources ${whereClause}`;

    return new Promise((resolve, reject) => {
      this.db.get(sqlCount, params, (cerr, crow: any) => {
        if (cerr) return reject(cerr);
        this.db.all(sqlData, [...params, limit, offset], (err, rows) => {
          if (err) return reject(err);
          const data = rows.map(r => this.rowToResource(r));
          resolve({ data, total: crow?.c ?? data.length });
        });
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