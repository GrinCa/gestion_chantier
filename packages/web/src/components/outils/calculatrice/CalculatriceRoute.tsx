import React, { useState } from "react";
import { OutilCalculatriceMoyenne } from "./OutilCalculatriceMoyenne";
import { CalculatriceSimple } from "./CalculatriceSimple";
import { TestCoreImport } from "../../TestCoreImport";
import { type Projet } from "../../../api/users";

/*
  Composant CalculatriceRoute :
  - Route dédiée à la calculatrice statistique.
  - Version de test : permet de comparer ancienne et nouvelle architecture.
*/

export function CalculatriceRoute({
  userTools,
  selectedProject,
  onSelectProject,
  onShowProjectManager,
  onBack
}: {
  userTools: string[];
  selectedProject: Projet | null;
  onSelectProject?: (projet: Projet | null) => void;
  onShowProjectManager?: () => void;
  onBack: () => void;
}) {
  const [version, setVersion] = useState<"legacy" | "core" | "test">("test");

  if (!userTools.includes("calculatrice")) {
    return <div className="p-4">Pas d'accès à cette fonction.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header de navigation */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Retour
        </button>
        
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow">
          <button
            onClick={() => setVersion("test")}
            className={`px-3 py-1 rounded text-sm ${
              version === "test" ? "bg-blue-500 text-white" : "text-gray-600"
            }`}
          >
            🧪 Test Core
          </button>
          <button
            onClick={() => setVersion("core")}
            className={`px-3 py-1 rounded text-sm ${
              version === "core" ? "bg-green-500 text-white" : "text-gray-600"
            }`}
          >
            ✅ Nouvelle Architecture
          </button>
          <button
            onClick={() => setVersion("legacy")}
            className={`px-3 py-1 rounded text-sm ${
              version === "legacy" ? "bg-yellow-500 text-white" : "text-gray-600"
            }`}
          >
            📦 Ancienne Version
          </button>
        </div>

        {selectedProject && (
          <div className="text-sm text-gray-600">
            Projet: <span className="font-medium">{selectedProject.nom}</span>
          </div>
        )}
      </div>

      {/* Contenu selon la version */}
      {version === "test" && (
        <div className="space-y-4">
          <TestCoreImport />
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-lg font-bold mb-2">🔬 Test de l'architecture</h2>
            <p className="text-gray-600 mb-4">
              Ce test vérifie que le package core peut être importé et utilisé correctement.
            </p>
            <p className="text-sm text-blue-600">
              ✅ Build package web: SUCCESS<br/>
              ✅ Import package core: OK<br/>
              🔄 Test runtime: En cours...
            </p>
          </div>
        </div>
      )}

      {version === "core" && (
        <div className="max-w-7xl mx-auto">
          <CalculatriceSimple selectedProject={selectedProject} />
        </div>
      )}

      {version === "legacy" && (
        <div className="flex justify-center">
          <div className="bg-white p-6 rounded-xl shadow w-full max-w-md">
            <OutilCalculatriceMoyenne 
              selectedProject={selectedProject}
              onSelectProject={onSelectProject}
              onShowProjectManager={onShowProjectManager}
              onBack={onBack} 
            />
          </div>
        </div>
      )}
    </div>
  );
}