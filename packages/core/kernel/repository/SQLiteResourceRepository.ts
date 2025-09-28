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
  private ftsReady = false;
  private static CURRENT_SCHEMA_VERSION = 2; // bump when schema changes
  constructor(opts?: SQLiteResourceRepositoryOptions){
    this.db = new sqlite3.Database(opts?.filename || ':memory:');
    this.init();
  }
  private init(){
    this.db.serialize(()=>{
      // meta table
      this.db.run(`CREATE TABLE IF NOT EXISTS __meta (
        schema_key TEXT PRIMARY KEY,
        schema_value TEXT NOT NULL
      )`);
      // resources table (initial)
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
      // indices (owner not yet tracked -> workspace_id + type, updated_at)
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_resources_workspace_type ON resources(workspace_id, type)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_resources_updated_at ON resources(updated_at)`);
      // Attempt FTS (best-effort). Some builds may not include FTS5; ignore errors.
      this.db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS resources_fts USING fts5(id UNINDEXED, content)`, (err)=>{
        if (!err) this.ftsReady = true; // mark available
      });
      // Set or migrate schema version
      this.db.get(`SELECT schema_value FROM __meta WHERE schema_key='schema_version'`, (err,row:any)=>{
        if (err) { /* ignore */ return; }
        const current = row ? parseInt(row.schema_value,10) : undefined;
        if (!current) {
          this.db.run(`INSERT OR REPLACE INTO __meta(schema_key, schema_value) VALUES ('schema_version', ?)`, [String(SQLiteResourceRepository.CURRENT_SCHEMA_VERSION)]);
        } else if (current < SQLiteResourceRepository.CURRENT_SCHEMA_VERSION) {
          // Placeholder for future incremental migrations
          // e.g., if (current < 3) { ... }
          this.db.run(`UPDATE __meta SET schema_value=? WHERE schema_key='schema_version'`, [String(SQLiteResourceRepository.CURRENT_SCHEMA_VERSION)]);
        }
      });
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
    let useFts = false;
    let ftsTerm: string | undefined;

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

    // Decide if we will run FTS path
    if (q.fullText) {
      const raw = q.fullText.trim();
      const tokens = raw.split(/\s+/).filter(t=> t.length);
      const normalized = tokens.join(' ');
      if (this.ftsReady && tokens.length) {
        useFts = true;
        ftsTerm = tokens.length > 1 ? tokens.map(t=> t).join(' AND ') : tokens[0];
      } else {
        // Fallback LIKE across tokens (AND semantics): each token must appear in payload OR metadata OR type
        for (const t of tokens) {
          where.push('(payload LIKE ? OR metadata LIKE ? OR type LIKE ?)');
          const like = `%${t}%`;
          params.push(like, like, like);
        }
      }
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

    let sqlData: string;
    let sqlCount: string;
    if (useFts && ftsTerm) {
      // Multi-term scoring: sum of per-token frequencies
      const originalTokens = q.fullText!.trim().split(/\s+/).filter(t=> t.length);
      const freqExprs = originalTokens.map(t=>`( (length(lower(f.content)) - length(replace(lower(f.content), lower('${t}'), '')))/length('${t}') )`).join(' + ');
      const scoreExpr = originalTokens.length ? freqExprs : '0';
      sqlCount = `SELECT COUNT(*) as c FROM resources r JOIN resources_fts f ON f.id=r.id WHERE r.workspace_id=? AND f.content MATCH ?`;
      sqlData = `SELECT r.*, (${scoreExpr}) as score
                 FROM resources r JOIN resources_fts f ON f.id=r.id
                 WHERE r.workspace_id=? AND f.content MATCH ?
                 ORDER BY score DESC, r.updated_at DESC
                 LIMIT ? OFFSET ?`;
    } else {
      sqlData = `SELECT * FROM resources ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
      sqlCount = `SELECT COUNT(*) as c FROM resources ${whereClause}`;
    }

    return new Promise((resolve, reject) => {
      if (useFts && ftsTerm) {
        const countParams = [workspaceId, ftsTerm];
        this.db.get(sqlCount, countParams, (cerr, crow: any) => {
          if (cerr) return reject(cerr);
          const dataParams = [workspaceId, ftsTerm, limit, offset];
          this.db.all(sqlData, dataParams, (err, rows:any[]) => {
            if (err) return reject(err);
            const data = rows.map(r => this.rowToResource(r));
            resolve({ data, total: crow?.c ?? data.length });
          });
        });
      } else {
        this.db.get(sqlCount, params, (cerr, crow: any) => {
          if (cerr) return reject(cerr);
          this.db.all(sqlData, [...params, limit, offset], (err, rows) => {
            if (err) return reject(err);
            const data = rows.map(r => this.rowToResource(r));
            resolve({ data, total: crow?.c ?? data.length });
          });
        });
      }
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
          if (this.ftsReady) {
            const content = [resource.type, JSON.stringify(resource.payload||''), JSON.stringify(resource.metadata||'')].join(' ');
            // FTS virtual tables often don't support standard UPSERT; emulate with delete + insert
            this.db.run(`DELETE FROM resources_fts WHERE id=?`, [resource.id], ()=>{
              this.db.run(`INSERT INTO resources_fts(id,content) VALUES (?,?)`, [resource.id, content], ()=>{/* ignore errors */});
            });
          }
          resolve(resource);
        });
    });
  }
  async delete(id: string): Promise<void> {
    return new Promise((resolve,reject)=>{
      this.db.run('DELETE FROM resources WHERE id=?', [id], err=>{ if(err) reject(err); else resolve(); });
    });
  }
  /** Rebuild FTS index from current resources (no-op if FTS unavailable). */
  async rebuildFullTextIndex(): Promise<boolean> {
    if (!this.ftsReady) return false;
    return new Promise<boolean>((resolve,reject)=>{
      this.db.serialize(()=>{
        this.db.run('DELETE FROM resources_fts', (delErr)=>{
          if (delErr) { /* treat as skip */ return resolve(false); }
          this.db.all('SELECT id,type,payload,metadata FROM resources', (err, rows: any[])=>{
            if (err) return reject(err);
            const stmt = this.db.prepare('INSERT INTO resources_fts(id,content) VALUES (?,?)');
            for (const r of rows) {
              const content = [r.type, r.payload, r.metadata].join(' ');
              stmt.run(r.id, content);
            }
            stmt.finalize(()=> resolve(true));
          });
        });
      });
    });
  }
  /** Internal debug accessor for self-tests */
  __debugUnsafeDb() { return this.db; }
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