/**
 * DATA ENGINE HOOK - React Hook pour DataEngine
 * ============================================
 * Hook React pour utiliser le DataEngine universellement
 */

import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import { DataEngine } from '@gestion-chantier/core';
import type { Project, DataEntry, DataQuery } from '@gestion-chantier/core';
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

// ===== PROJECT HOOKS =====

export function useProjects(userId?: string) {
  const { dataEngine } = useDataEngine();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !dataEngine) return;

    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const userProjects = await dataEngine.getUserProjects(userId);
        setProjects(userProjects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [dataEngine, userId]);

  const createProject = async (name: string, description?: string, domain = 'construction') => {
    if (!userId || !dataEngine) throw new Error('User ID and DataEngine required');
    
    try {
      const project = await dataEngine.createProject({
        name,
        description,
        domain,
        owner: userId,
        metadata: {}
      });
      
      setProjects(prev => [project, ...prev]);
      return project;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  return {
    projects,
    loading,
    error,
    createProject,
    refetch: () => {
      if (userId && dataEngine) {
        dataEngine.getUserProjects(userId).then(setProjects);
      }
    }
  };
}

export function useProject(projectId?: string) {
  const { dataEngine } = useDataEngine();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !dataEngine) {
      setProject(null);
      setLoading(false);
      return;
    }

    const loadProject = async () => {
      try {
        setLoading(true);
        setError(null);
        const proj = await dataEngine.getProject(projectId);
        setProject(proj);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [dataEngine, projectId]);

  return { project, loading, error };
}

// ===== DATA HOOKS =====

export function useProjectData(projectId?: string, dataTypes?: string[]) {
  const { dataEngine } = useDataEngine();
  const [data, setData] = useState<DataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !dataEngine) {
      setData([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const query: DataQuery = {
          project_id: projectId,
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
  }, [dataEngine, projectId, dataTypes?.join(',')]);

  const createData = async (dataType: string, content: any, toolOrigin: string) => {
    if (!projectId || !dataEngine) throw new Error('Project ID and DataEngine required');
    
    try {
      const entry = await dataEngine.createData(projectId, dataType, content, toolOrigin);
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
      if (projectId && dataEngine) {
        const query: DataQuery = {
          project_id: projectId,
          data_types: dataTypes,
          sort: [{ field: 'created_at', direction: 'desc' }]
        };
        dataEngine.queryData(query).then(result => setData(result.data));
      }
    }
  };
}

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