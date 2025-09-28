/**
 * MOBILE DATA ENGINE HOOK - React Native
 * =====================================
 * Hook React Native pour utiliser le DataEngine universellement
 */

import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import { DataEngine } from '@gestion-chantier/core';
import type { Project, DataEntry, DataQuery } from '@gestion-chantier/core';
import { createMobileDataEngine } from '../adapters/mobile-adapters';

// ===== CONTEXT =====

interface MobileDataEngineContextType {
  dataEngine: DataEngine | null;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  isInitialized: boolean;
}

const MobileDataEngineContext = createContext<MobileDataEngineContextType>({
  dataEngine: null,
  isOnline: true,
  syncStatus: 'idle',
  isInitialized: false
});

// ===== PROVIDER =====

interface MobileDataEngineProviderProps {
  children: ReactNode;
  apiUrl?: string;
}

export function MobileDataEngineProvider({ children, apiUrl }: MobileDataEngineProviderProps) {
  const [dataEngine, setDataEngine] = useState<DataEngine | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeDataEngine = async () => {
      try {
        console.log('🚀 Initializing Mobile DataEngine...');
        const engine = createMobileDataEngine(apiUrl);
        setDataEngine(engine);
        setIsInitialized(true);
        console.log('✅ Mobile DataEngine initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Mobile DataEngine:', error);
        setSyncStatus('error');
      }
    };

    initializeDataEngine();
  }, [apiUrl]);

  // Auto-sync périodique
  useEffect(() => {
    if (!dataEngine || !isOnline) return;

    const syncInterval = setInterval(async () => {
      try {
        setSyncStatus('syncing');
        await dataEngine.syncPendingChanges();
        setSyncStatus('idle');
      } catch (error) {
        console.warn('Sync failed:', error);
        setSyncStatus('error');
      }
    }, 30000); // Sync toutes les 30 secondes

    return () => clearInterval(syncInterval);
  }, [dataEngine, isOnline]);

  return (
    <MobileDataEngineContext.Provider value={{
      dataEngine,
      isOnline,
      syncStatus,
      isInitialized
    }}>
      {children}
    </MobileDataEngineContext.Provider>
  );
}

// ===== HOOKS UTILITAIRES =====

export function useMobileDataEngine() {
  const context = useContext(MobileDataEngineContext);
  if (!context) {
    throw new Error('useMobileDataEngine must be used within MobileDataEngineProvider');
  }
  return context;
}

export function useMobileProjects(userId?: string) {
  const { dataEngine, isInitialized } = useMobileDataEngine();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    if (!dataEngine || !userId || !isInitialized) return;

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

  useEffect(() => {
    loadProjects();
  }, [dataEngine, userId, isInitialized]);

  const createProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    if (!dataEngine) throw new Error('DataEngine not initialized');
    
    const newProject = await dataEngine.createProject(project);
    await loadProjects(); // Refresh
    return newProject;
  };

  return {
    projects,
    loading,
    error,
    createProject,
    refresh: loadProjects
  };
}

export function useMobileProjectData(projectId?: string, dataTypes?: string[]) {
  const { dataEngine, isInitialized } = useMobileDataEngine();
  const [data, setData] = useState<DataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!dataEngine || !projectId || !isInitialized) return;

    try {
      setLoading(true);
      setError(null);
      
      const query: DataQuery = {
        project_id: projectId,
        data_types: dataTypes,
        limit: 1000
      };

      const result = await dataEngine.queryData(query);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataEngine, projectId, isInitialized, dataTypes?.join(',')]);

  const createData = async (dataType: string, content: any, toolOrigin: string) => {
    if (!dataEngine || !projectId) throw new Error('DataEngine or projectId not available');
    
    const newData = await dataEngine.createData(projectId, dataType, content, toolOrigin);
    await loadData(); // Refresh
    return newData;
  };

  return {
    data,
    loading,
    error,
    createData,
    refresh: loadData
  };
}

// Hook pour la calculatrice mobile (utilise la logique métier du core)
export function useMobileCalculatrice(projectId?: string) {
  const { createData } = useMobileProjectData(projectId, ['measurement']);
  
  const saveCalculatriceData = async (groupes: any[]) => {
    if (!projectId) throw new Error('Project ID required');
    
    return await createData('measurement', {
      type: 'calculatrice_session',
      groupes,
      timestamp: Date.now()
    }, 'calculatrice');
  };

  return {
    saveCalculatriceData
  };
}