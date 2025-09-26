import React from "react";
import { OutilCalculatriceMoyenne } from "./OutilCalculatriceMoyenne";

export function CalculatriceView({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-md">
        <OutilCalculatriceMoyenne selectedProject={null} onSelectProject={() => {}} onShowProjectManager={() => {}} onBack={onBack} />
        <button
          className="mt-6 px-4 py-2 rounded bg-gray-200 w-full"
          onClick={onBack}
        >
          Retour
        </button>
      </div>
    </div>
  );
}
