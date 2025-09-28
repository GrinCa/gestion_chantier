/**
 * MOBILE DATA ENGINE HOOK - React Native
 * =====================================
 * Hook React Native pour utiliser le DataEngine universellement
 */

import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import { DataEngine } from '@gestion-chantier/core';
import type { Workspace, DataEntry, DataQuery } from '@gestion-chantier/core';
import { createMobileDataEngine } from '../adapters/mobile-adapters.js';

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

export function useMobileWorkspaces(userId?: string) {
  const { dataEngine, isInitialized } = useMobileDataEngine();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = async () => {
    if (!dataEngine || !userId || !isInitialized) return;

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

  useEffect(() => {
    loadWorkspaces();
  }, [dataEngine, userId, isInitialized]);

  const createWorkspace = async (workspace: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>) => {
    if (!dataEngine) throw new Error('DataEngine not initialized');
    
    const newWorkspace = await dataEngine.createWorkspace(workspace as any);
    await loadWorkspaces(); // Refresh
    return newWorkspace;
  };

  return {
    workspaces,
    loading,
    error,
    createWorkspace,
    refresh: loadWorkspaces
  };
}

/** @deprecated Use useMobileWorkspaces */
export const useMobileProjects = useMobileWorkspaces; // deprecated alias

export function useMobileWorkspaceData(workspaceId?: string, dataTypes?: string[]) {
  const { dataEngine, isInitialized } = useMobileDataEngine();
  const [data, setData] = useState<DataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!dataEngine || !workspaceId || !isInitialized) return;

    try {
      setLoading(true);
      setError(null);
      
      const query: DataQuery = {
        project_id: workspaceId, // field kept for backward compatibility
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
  }, [dataEngine, workspaceId, isInitialized, dataTypes?.join(',')]);

  const createData = async (dataType: string, content: any, toolOrigin: string) => {
    if (!dataEngine || !workspaceId) throw new Error('DataEngine or workspaceId not available');
    
    const newData = await dataEngine.createData(workspaceId, dataType, content, toolOrigin);
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
export function useMobileCalculatrice(workspaceId?: string) {
  const { createData } = useMobileWorkspaceData(workspaceId, ['measurement']);
  
  const saveCalculatriceData = async (groupes: any[]) => {
  if (!workspaceId) throw new Error('Workspace ID required');
    
    return await createData('measurement', {
      type: 'calculatrice_session',
      groupes,
      timestamp: Date.now()
    }, 'calculatrice');
  };

  return { saveCalculatriceData };
}

/** @deprecated Use useMobileWorkspaceData */
export const useMobileProjectData = useMobileWorkspaceData; // deprecated alias