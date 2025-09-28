/**
 * TEST CORE IMPORT - Version minimale
 * ==================================
 */

import React, { useState, useEffect } from 'react';

// Test d'import simple
import { calculatriceTool, LABELS_PREDEFINIS, type GroupeMesures } from '@gestion-chantier/core';

export function TestCoreImport() {
  const [testResult, setTestResult] = useState<string>('En attente...');
  const [isLoading, setIsLoading] = useState(false);

  // Test automatique au montage
  useEffect(() => {
    try {
      const testData = calculatriceTool.getDefaultData();
      setTestResult(`✅ Core chargé: ${testData.length} groupes par défaut`);
      console.log('✅ Core import automatique OK:', testData);
    } catch (error) {
      setTestResult(`❌ Erreur: ${error}`);
      console.error('❌ Core import automatique ERROR:', error);
    }
  }, []);

  const handleManualTest = () => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        // Test plus complet
        const testData = calculatriceTool.getDefaultData();
        const stats = calculatriceTool.getAllGroupsStats(testData);
        const labelsCount = Object.keys(LABELS_PREDEFINIS).length;
        
        const result = `✅ Tests OK:
• ${testData.length} groupes par défaut
• ${stats.length} stats calculées  
• ${labelsCount} labels prédéfinis
• Architecture universelle fonctionnelle !`;
        
        setTestResult(result);
        console.log('✅ Test manuel complet:', { testData, stats, labelsCount });
        
      } catch (error) {
        setTestResult(`❌ Erreur test manuel: ${error}`);
        console.error('❌ Test manuel ERROR:', error);
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="p-4 border-2 border-blue-300 bg-blue-50 rounded">
      <h2 className="text-lg font-bold mb-2">🧪 Test Core Import & Architecture</h2>
      
      <div className="mb-4 p-3 bg-white rounded border">
        <h3 className="font-medium mb-1">Résultat:</h3>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">{testResult}</pre>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={handleManualTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '🔄 Test...' : '🚀 Test Manuel Complet'}
        </button>
        
        <button 
          onClick={() => console.log('📊 LABELS_PREDEFINIS:', LABELS_PREDEFINIS)}
          className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          📊 Voir Labels
        </button>
      </div>
    </div>
  );
}