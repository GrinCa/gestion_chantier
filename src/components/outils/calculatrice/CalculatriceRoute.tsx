import React from "react";
import { OutilCalculatriceMoyenne } from "./OutilCalculatriceMoyenne";

/*
  Composant CalculatriceRoute :
  - Route dédiée à la calculatrice statistique.
  - Affiche le composant OutilCalculatriceMoyenne.
*/

export function CalculatriceRoute({
  userTools,
  onBack
}: {
  userTools: string[];
  onBack: () => void;
}) {
  if (!userTools.includes("calculatrice")) {
    return <div className="p-4">Pas d'accès à cette fonction.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-md">
        <OutilCalculatriceMoyenne onBack={onBack} />
        {/* Supprime le bouton retour ici, il est géré dans OutilCalculatriceMoyenne */}
      </div>
    </div>
  );
}