import React, { useState } from "react";
import OutilMesureMultiRef from "./OutilMesureMultiRef";
import { type Projet } from "../../../api/users";

// Composant calculatrice statistique simple (version sans système de prise de cotes)
type OutilCalculatriceMoyenneProps = { 
  selectedProject: Projet | null;
  onSelectProject?: (projet: Projet | null) => void;
  onShowProjectManager?: () => void;
  onBack?: () => void;
};

export function OutilCalculatriceMoyenne({ selectedProject, onSelectProject, onShowProjectManager, onBack }: OutilCalculatriceMoyenneProps) {
  // mode = 'stat' | 'multi'
  const [mode, setMode] = useState<'stat'|'multi'>('stat');
  const STORAGE_KEY = 'outil-calculatrice-moyenne';
  // Initialisation depuis localStorage
  const [input, setInput] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return typeof data.input === 'string' ? data.input : '';
    } catch {
      return '';
    }
  });
  const [values, setValues] = useState<number[]>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return Array.isArray(data.values) ? data.values : [];
    } catch {
      return [];
    }
  });

  // Sauvegarde à chaque changement
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ input, values }));
  }, [input, values]);

  // Parse la saisie utilisateur en nombre
  function parseInput(str: string): number | null {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  // Ajoute la valeur saisie à la liste
  function handleValidate() {
    const n = parseInput(input);
    if (n == null) return;
    setValues((prev) => [...prev, n]);
    setInput("");
  }

  // Efface la saisie courante
  function handleClear() {
    setInput("");
  }

  // Réinitialise toutes les valeurs avec confirmation
  function handleReset() {
    if (window.confirm("Voulez-vous vraiment réinitialiser toutes les valeurs ?")) {
      setValues([]);
      setInput("");
    }
  }

  // Supprime le dernier caractère de la saisie
  function handleBackspace() {
  setInput((s: string) => s.slice(0, -1));
  }

  // Gère le clic sur le pavé numérique ou les boutons d'action
  function handlePadClick(key: string) {
    if (key === "⌫") return handleBackspace();
    if (key === "C") return handleClear();
    if (key === "Valider") return handleValidate();
    if (key === "Reset") return handleReset();
    // pour éviter plusieurs séparateurs successifs
  setInput((prev: string) => prev + key);
  }

  // Supprime une valeur de la liste avec confirmation
  function removeValueAt(index: number) {
    if (window.confirm("Supprimer cette valeur ?")) {
      setValues((prev) => prev.filter((_, i) => i !== index));
    }
  }

  // Calcul des statistiques
  const moyenne = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;
  const ecartType =
    values.length > 1
      ? Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - (moyenne ?? 0), 2), 0) / (values.length - 1))
      : null;

  // Pavé numérique 3x4 (lignes)
  const padRows = [["7","8","9"],["4","5","6"],["1","2","3"],["0",",", "."]];

  return (
    <div className="p-4 rounded-xl border bg-white shadow max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xl font-bold">{mode === 'stat' ? 'Calculatrice Statistique' : 'Mesures multi-références'}</h2>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setMode('stat')}
            className={`px-3 py-1 rounded-lg border ${mode==='stat' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
          >Stat</button>
          <button
            onClick={() => setMode('multi')}
            className={`px-3 py-1 rounded-lg border ${mode==='multi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}
          >Multi-ref</button>
        </div>
      </div>

      {/* Gestion des projets pour Multi-ref */}
      {mode === 'multi' && (
        <div className="mb-4 p-3 border rounded-lg bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-blue-700">
              📁 Projet: {selectedProject ? selectedProject.nom : 'Aucun projet sélectionné'}
            </div>
            {onShowProjectManager && (
              <button
                onClick={onShowProjectManager}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Gérer projets
              </button>
            )}
          </div>
          {selectedProject && selectedProject.description && (
            <div className="text-xs text-blue-600 mt-1">{selectedProject.description}</div>
          )}
        </div>
      )}

      {mode === 'multi' && (
        <div className="mt-2">
          <OutilMesureMultiRef selectedProject={selectedProject} />
        </div>
      )}

      {mode === 'stat' && (
        <>

      {onBack && (
        <div className="mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m6 0l-3-3m3 3l-3 3" />
            </svg>
            Retour
          </button>
        </div>
      )}

      <div className="mb-3">
        <input
          aria-label="Saisie"
          className="border rounded-xl px-3 py-2 w-full text-right text-lg font-mono"
          value={input}
          placeholder="Saisir une valeur"
          readOnly
        />
      </div>

      {/* pad 3x4 + colonne d'actions */}
      <div className="flex gap-4 mb-4 items-stretch">
        <div className="flex flex-col gap-3 w-fit">
          {padRows.map((row, i) => (
            <div key={i} className="flex gap-3">
              {row.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                  style={{ width: '96px', height: '80px', fontSize: '2.25rem' }}
                  onClick={() => handlePadClick(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 w-28">
          <button
            type="button"
            className="w-full h-12 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
            onClick={handleBackspace}
            disabled={input.length === 0}
            title="Backspace"
          >⌫</button>
          <button
            type="button"
            className="w-full h-12 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
            onClick={handleClear}
            disabled={input.length === 0}
          >C</button>
          <button
            type="button"
            className="w-full h-12 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold flex items-center justify-center text-2xl"
            onClick={handleValidate}
            disabled={input.trim() === ""}
            title="Valider"
          >✅</button>
          <button
            type="button"
            className="w-full h-12 rounded-lg bg-gray-200 hover:bg-red-300 font-semibold flex items-center justify-center text-2xl"
            onClick={handleReset}
            disabled={values.length === 0}
            title="Réinitialiser"
          >❌</button>
        </div>
      </div>

      {/* Valeurs séparées en lecture simple */}
      {values.length > 0 && (
        <div className="mb-3">
          {/* pills : flex wrap pour organisation intelligente et taille réduite */}
          <div
            className="p-2 bg-gray-50 rounded border min-h-[40px]"
            style={{
              display: 'grid',
              gap: '8px',
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              /* Responsive columns: 2 on mobile, 4 on tablet, 6 on desktop */
            }}
          >
            <style>{`
              @media (max-width: 640px) {
                .calc-values-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              }
              @media (min-width: 641px) and (max-width: 1024px) {
                .calc-values-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
              }
              @media (min-width: 1025px) {
                .calc-values-grid { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
              }
            `}</style>
          <div className="calc-values-grid" style={{ display: 'contents' }}>
            {values.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => removeValueAt(i)}
                title="Cliquez pour supprimer"
                className="bg-gray-200 rounded font-mono hover:bg-red-100 w-full"
                style={{ fontSize: '0.75rem', padding: '2px 6px', height: '28px' }}
              >
                {v}
              </button>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-semibold">Moyenne :</span> {moyenne != null ? moyenne.toFixed(4) : "-"}
        </div>
        <div>
          <span className="font-semibold">Écart-type :</span> {ecartType != null ? ecartType.toFixed(4) : "-"}
        </div>
        <div>
          <span className="font-semibold">Min :</span> {min != null ? min : "-"}
        </div>
        <div>
          <span className="font-semibold">Max :</span> {max != null ? max : "-"}
        </div>
      </div>

      {/* Affichage du résultat sous forme de bouton uniquement */}
      {moyenne != null && (
        <button className="px-4 py-2 rounded bg-green-100 text-green-900 font-bold w-full mt-4">
          {moyenne.toFixed(4)}
        </button>
      )}
      </>
      )}
    </div>
  );
}