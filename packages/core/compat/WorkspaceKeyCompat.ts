/**
 * WorkspaceKeyCompat.ts
 * ---------------------------------------------
 * Transitional wrapper to shift storage keys from `project:` to `workspace:`.
 * Minimal, lean, removable.
 * Removal plan: once all callers use workspace_id and legacy project: keys are migrated,
 * delete this file and its export path (Section 8 completion criteria).
 */
import type { DataEngine } from '@gestion-chantier/core';

export interface WorkspaceCompatOptions {
  enableWarnings?: boolean;
}

export interface WorkspaceCompatHandle {
  getLegacyFallbackCount(): number;
  unwrap(): DataEngine;
}

export function wrapDataEngineWorkspaceCompat(engine: any, opts: WorkspaceCompatOptions = {}): WorkspaceCompatHandle & DataEngine {
  let legacyFallbackCount = 0;
  const warn = (msg: string) => { if (opts.enableWarnings !== false) console.warn('[workspace-compat]', msg); };
  const storage = (engine as any).storage;
  if (!storage) return engine;

  async function readWorkspace(id: string){
    const ws = await storage.get(`workspace:${id}`);
    if (ws) return ws;
    const legacy = await storage.get(`project:${id}`);
    if (legacy) { legacyFallbackCount++; warn(`fallback project:${id}`); }
    return legacy;
  }

  // Patch: createWorkspace writes only new key
  const originalCreateWorkspace = engine.createWorkspace?.bind(engine);
  if (originalCreateWorkspace) {
    (engine as any).createWorkspace = async (data: any) => {
      const created = await originalCreateWorkspace(data);
      try { await storage.set(`workspace:${created.id}`, created); } catch{} // ensure new key
      return created;
    };
  }

  // Patch: getWorkspace
  const originalGetWorkspace = engine.getWorkspace?.bind(engine);
  if (originalGetWorkspace) {
    (engine as any).getWorkspace = async (id: string) => {
      // Try normal API path first (may fetch & set project:)
      const res = await originalGetWorkspace(id);
      if (res) {
        // ensure new key mirror
        try { await storage.set(`workspace:${res.id}`, res); } catch{}
        return res; }
      const fallback = await readWorkspace(id);
      if (fallback) try { await storage.set(`workspace:${fallback.id}`, fallback); } catch{}
      return fallback;
    };
  }

  // Patch: getUserWorkspaces -> ensure every local legacy entry mirrored
  const originalGetUserWorkspaces = engine.getUserWorkspaces?.bind(engine);
  if (originalGetUserWorkspaces) {
    (engine as any).getUserWorkspaces = async (userId: string) => {
      const list = await originalGetUserWorkspaces(userId);
      // mirror silently
      for (const ws of list || []) {
        try { await storage.set(`workspace:${ws.id}`, ws); } catch{}
      }
      return list;
    };
  }

  // Patch: queryData - rewrite query object field if present
  const originalQueryData = engine.queryData?.bind(engine);
  if (originalQueryData) {
    (engine as any).queryData = async (query: any) => {
      if (query && query.project_id && !query.workspace_id) {
        query = { ...query, workspace_id: query.project_id }; // augment
      }
      return originalQueryData(query);
    };
  }

  // Patch: createData to ensure it writes workspace key mirror (if engine writes project key internally)
  const originalCreateData = engine.createData?.bind(engine);
  if (originalCreateData) {
    (engine as any).createData = async (workspaceId: string, type: string, payload: any, origin: string) => {
      const entry = await originalCreateData(workspaceId, type, payload, origin);
      // ensure workspace key for parent workspace exists if already cached
      try {
        const ws = await storage.get(`project:${workspaceId}`) || await storage.get(`workspace:${workspaceId}`);
        if (ws) await storage.set(`workspace:${workspaceId}`, ws);
      } catch{}
      return entry;
    };
  }

  return Object.assign(engine, {
    getLegacyFallbackCount(){ return legacyFallbackCount; },
    unwrap(){ return engine; }
  });
}
