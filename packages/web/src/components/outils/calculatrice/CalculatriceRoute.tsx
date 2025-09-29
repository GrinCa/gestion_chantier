import React from "react";
import { type Projet } from "../../../api/users";
import CalculatriceUI from "./CalculatriceUI";

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
  if (!userTools.includes("calculatrice")) {
    return <div className="p-4">Pas d'accès à cette fonction.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Retour
        </button>
        {selectedProject && (
          <div className="text-sm text-gray-600">
            Projet: <span className="font-medium">{selectedProject.nom}</span>
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow w-full max-w-7xl">
          <CalculatriceUI selectedProject={selectedProject} />
        </div>
      </div>
    </div>
  );
}