/**
 * TEST DATA ENGINE - Page de test pour la nouvelle architecture
 * =============================================================
 */

import React, { useState } from 'react';
import { DataEngineProvider, useDataEngine, useWorkspaces } from '../hooks/useDataEngine';

function TestDataEngineComponent() {
  const { dataEngine, isOnline, syncStatus } = useDataEngine();
  const { workspaces, loading, error, createWorkspace } = useWorkspaces('user-1');
  const [workspaceName, setWorkspaceName] = useState('');

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    
    try {
  await createWorkspace(workspaceName, `Workspace de test créé le ${new Date().toLocaleString()}`);
  setWorkspaceName('');
    } catch (err) {
      console.error('Erreur création projet:', err);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">🚀 Test DataEngine Architecture</h2>
      
      {/* Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Status du DataEngine:</h3>
        <div className="space-y-1 text-sm">
          <div>Connecté: <span className={isOnline ? 'text-green-600' : 'text-red-600'}>{isOnline ? '✅ Online' : '❌ Offline'}</span></div>
          <div>Sync: <span className="text-blue-600">{syncStatus}</span></div>
          <div>Engine: <span className="text-green-600">{dataEngine ? '✅ Initialisé' : '❌ Non initialisé'}</span></div>
        </div>
      </div>

  {/* Création de workspace (ex-projet) */}
      <div className="mb-6 p-4 border rounded">
  <h3 className="font-semibold mb-3">Créer un nouveau workspace (ancien projet):</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Nom du workspace..."
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleCreateWorkspace}
            disabled={!workspaceName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Créer
          </button>
        </div>
      </div>

  {/* Liste des workspaces */}
      <div className="mb-6">
  <h3 className="font-semibold mb-3">Workspaces (Universal DataEngine):</h3>
        {loading && <p className="text-gray-500">Chargement...</p>}
        {error && <p className="text-red-500">Erreur: {error}</p>}
        {!loading && !error && (
          <div className="space-y-2">
            {workspaces.length === 0 ? (
              <p className="text-gray-500 italic">Aucun workspace pour l'instant</p>
            ) : (
              workspaces.map(ws => (
                <div key={ws.id} className="p-3 border rounded bg-gray-50">
                  <div className="font-medium">{ws.name}</div>
                  <div className="text-sm text-gray-600">{ws.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Domaine: {ws.domain} | Créé: {new Date(ws.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Architecture Info */}
      <div className="p-4 bg-blue-50 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">🏗️ Architecture Monorepo</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✅ packages/core - DataEngine universel</li>
          <li>✅ packages/web - Interface React (cette page)</li>
          <li>✅ packages/server - API backend</li>
          <li>🔄 packages/mobile - À venir (React Native/Expo)</li>
        </ul>
      </div>
    </div>
  );
}

export function TestDataEnginePage() {
  // Configuration dynamique de l'API URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <DataEngineProvider apiUrl={apiUrl}>
          <TestDataEngineComponent />
        </DataEngineProvider>
      </div>
    </div>
  );
}