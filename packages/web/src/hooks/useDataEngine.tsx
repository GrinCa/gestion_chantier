/**
 * DATA ENGINE HOOK - React Hook pour DataEngine
 * ============================================
 * Hook React pour utiliser le DataEngine universellement
 */

import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import { DataEngine } from '@gestion-chantier/core';
import type { Project, Workspace, DataEntry, DataQuery } from '@gestion-chantier/core';
import { createWebDataEngine } from '../adapters/web-adapters';

// ===== CONTEXT =====

interface DataEngineContextType {
  dataEngine: DataEngine | null;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
}

const DataEngineContext = createContext<DataEngineContextType>({
  dataEngine: null,
  isOnline: true,
  syncStatus: 'idle'
});

// ===== PROVIDER =====

interface DataEngineProviderProps {
  children: ReactNode;
  apiUrl?: string;
}

export function DataEngineProvider({ children, apiUrl }: DataEngineProviderProps) {
  const [dataEngine, setDataEngine] = useState<DataEngine | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  useEffect(() => {
    const engine = createWebDataEngine(apiUrl);
    setDataEngine(engine);

    // Listen to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [apiUrl]);

  const contextValue: DataEngineContextType = {
    dataEngine,
    isOnline,
    syncStatus
  };

  return (
    <DataEngineContext.Provider value={contextValue}>
      {children}
    </DataEngineContext.Provider>
  );
}

// ===== HOOKS =====

export function useDataEngine() {
  const context = useContext(DataEngineContext);
  if (!context.dataEngine) {
    throw new Error('useDataEngine must be used within a DataEngineProvider');
  }
  return context;
}

// ===== WORKSPACE (ex-Project) HOOKS =====

export function useWorkspaces(userId?: string) {
  const { dataEngine } = useDataEngine();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !dataEngine) return;

    const loadWorkspaces = async () => {
      try {
        setLoading(true);
        setError(null);
        const userWorkspaces = await dataEngine.getUserWorkspaces(userId as any);
        setWorkspaces(userWorkspaces as any);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [dataEngine, userId]);

  const createWorkspace = async (name: string, description?: string, domain = 'construction') => {
    if (!userId || !dataEngine) throw new Error('User ID and DataEngine required');
    
    try {
      const workspace = await dataEngine.createWorkspace({
        name,
        description,
        domain,
        owner: userId,
        metadata: {}
      });
      
      setWorkspaces(prev => [workspace as any, ...prev]);
      return workspace;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create workspace');
    }
  };

  return {
    workspaces,
    loading,
    error,
    createWorkspace,
    refetch: () => {
      if (userId && dataEngine) {
        dataEngine.getUserWorkspaces(userId).then(ws => setWorkspaces(ws as any));
      }
    }
  };
}

// Backward-compatible alias (will be removed later)
/** @deprecated Use useWorkspaces */
export const useProjects = useWorkspaces;

export function useWorkspace(workspaceId?: string) {
  const { dataEngine } = useDataEngine();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId || !dataEngine) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    const loadWorkspace = async () => {
      try {
        setLoading(true);
        setError(null);
        const ws = await dataEngine.getWorkspace(workspaceId as any);
        setWorkspace(ws as any);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [dataEngine, workspaceId]);

  return { workspace, loading, error };
}

/** @deprecated Use useWorkspace */
export const useProject = useWorkspace; // deprecated alias

// ===== DATA HOOKS =====

export function useWorkspaceData(workspaceId?: string, dataTypes?: string[]) {
  const { dataEngine } = useDataEngine();
  const [data, setData] = useState<DataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId || !dataEngine) {
      setData([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const query: DataQuery = {
          project_id: workspaceId, // field name kept for now in query object
          data_types: dataTypes,
          sort: [{ field: 'created_at', direction: 'desc' }]
        };
        
        const result = await dataEngine.queryData(query);
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataEngine, workspaceId, dataTypes?.join(',')]);

  const createData = async (dataType: string, content: any, toolOrigin: string) => {
  if (!workspaceId || !dataEngine) throw new Error('Workspace ID and DataEngine required');
    
    try {
  const entry = await dataEngine.createData(workspaceId, dataType, content, toolOrigin);
      setData(prev => [entry, ...prev]);
      return entry;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create data');
    }
  };

  return {
    data,
    loading,
    error,
    createData,
    refetch: () => {
      if (workspaceId && dataEngine) {
        const query: DataQuery = {
          project_id: workspaceId,
          data_types: dataTypes,
          sort: [{ field: 'created_at', direction: 'desc' }]
        };
        dataEngine.queryData(query).then(result => setData(result.data));
      }
    }
  };
}

/** @deprecated Use useWorkspaceData */
export const useProjectData = useWorkspaceData; // deprecated alias

// ===== SYNC HOOKS =====

export function useSync() {
  const { dataEngine, isOnline, syncStatus } = useDataEngine();
  
  const triggerSync = async () => {
    if (!isOnline || !dataEngine) {
      throw new Error('Cannot sync while offline or without DataEngine');
    }
    
    try {
      await dataEngine.syncPendingChanges();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  return {
    isOnline,
    syncStatus,
    triggerSync
  };
}