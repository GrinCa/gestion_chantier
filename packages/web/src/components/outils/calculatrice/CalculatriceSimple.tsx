/**
 * CALCULATRICE SIMPLE - Version test avec core direct
 * ==================================================
 */

import React, { useState, useEffect } from 'react';
import { calculatriceTool, LABELS_PREDEFINIS, type GroupeMesures } from '@gestion-chantier/core';

interface CalculatriceSimpleProps {
  selectedProject?: { id: string; nom: string } | null;
}

export function CalculatriceSimple({ selectedProject }: CalculatriceSimpleProps) {
  const [groups, setGroups] = useState<GroupeMesures[]>(() => 
    calculatriceTool.getDefaultData()
  );

  // Test que le core fonctionne
  useEffect(() => {
    console.log('🚀 Calculatrice Core chargé !');
    console.log('Groupes par défaut:', groups);
    console.log('Labels disponibles:', LABELS_PREDEFINIS);
  }, []);

  const handleAddMesure = (groupId: string, sectionId: string) => {
    const updated = calculatriceTool.addMesure(groups, groupId, sectionId, 0);
    setGroups(updated);
  };

  const handleUpdateMesure = (groupId: string, mesureId: string, value: number) => {
    const updated = calculatriceTool.updateMesure(groups, groupId, mesureId, { raw: value });
    setGroups(updated);
  };

  const handleAddGroupe = () => {
    const updated = calculatriceTool.addGroupe(groups, `Position ${groups.length + 1}`);
    setGroups(updated);
  };

  const allStats = calculatriceTool.getAllGroupsStats(groups);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-600">✅ Calculatrice Core v2</h1>
        {selectedProject && (
          <p className="text-gray-600">Projet: {selectedProject.nom}</p>
        )}
        <p className="text-sm text-blue-600">Architecture universelle fonctionnelle !</p>
      </div>

      {/* Actions */}
      <div className="mb-4">
        <button
          onClick={handleAddGroupe}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Ajouter Position
        </button>
      </div>

      {/* Stats globales */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h2 className="text-lg font-semibold text-green-800 mb-2">📊 Statistiques</h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {allStats.map(stat => (
            <div key={stat.groupId} className="bg-white p-3 rounded border">
              <h3 className="font-medium">{stat.groupLabel}</h3>
              {stat.hasValidMesures ? (
                <div className="text-sm">
                  <div>Moyenne: <span className="font-mono">{stat.calculation.moyenne.toFixed(3)}</span></div>
                  <div>Count: <span className="font-mono">{stat.calculation.count}</span></div>
                  {stat.reference.globalValue !== null && (
                    <div className="text-green-600 font-semibold">
                      Global: <span className="font-mono">{stat.reference.globalValue.toFixed(3)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-sm">Aucune mesure</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Groupes */}
      <div className="space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={group.id} className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">{group.label}</h3>
            
            {group.sections.map(section => (
              <div key={section.id} className="mb-4 p-3 bg-white rounded border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{section.label}</h4>
                  <button
                    onClick={() => handleAddMesure(group.id, section.id)}
                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + Mesure
                  </button>
                </div>
                
                <div className="space-y-2">
                  {section.mesures.map(mesure => (
                    <div key={mesure.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <input
                        type="number"
                        value={mesure.raw}
                        onChange={(e) => handleUpdateMesure(group.id, mesure.id, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded text-center"
                        step="0.001"
                      />
                      <span className="flex-1 text-sm text-gray-600">
                        {mesure.label || 'Sans label'}
                      </span>
                      <span className="text-sm font-mono text-green-600">
                        ID: {mesure.id.slice(-4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {groupIndex > 0 && (
              <div className="text-xs text-gray-500">
                Offset: {group.storedRelOffset?.toFixed(3) || 'N/A'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Debug */}
      <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
        <details>
          <summary className="cursor-pointer font-medium">🔧 Debug Info</summary>
          <pre className="mt-2 overflow-auto">
            {JSON.stringify({ groupCount: groups.length, statsCount: allStats.length }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}