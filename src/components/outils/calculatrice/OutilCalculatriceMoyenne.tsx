import React, { useState } from "react";

/*
  Composant OutilCalculatriceMoyenne :
  - Affiche un pavé numérique pour saisir des valeurs.
  - Permet d'ajouter, supprimer, réinitialiser les valeurs.
  - Affiche les statistiques calculées (moyenne, min, max, écart-type).
  - Les valeurs peuvent être supprimées individuellement via les pills.
  - Ajoute un bouton retour en haut si la prop onBack est fournie.
*/

// Définition explicite des props
type OutilCalculatriceMoyenneProps = {
  onBack?: () => void;
};

export function OutilCalculatriceMoyenne({ onBack }: OutilCalculatriceMoyenneProps) {
  // Saisie courante
  const [input, setInput] = useState("");
  // Liste des valeurs ajoutées
  const [values, setValues] = useState<number[]>([]);

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

  // Réinitialise toutes les valeurs
  function handleReset() {
    setValues([]);
    setInput("");
  }

  // Supprime le dernier caractère de la saisie
  function handleBackspace() {
    setInput((s) => s.slice(0, -1));
  }

  // Gère le clic sur le pavé numérique ou les boutons d'action
  function handlePadClick(key: string) {
    if (key === "⌫") return handleBackspace();
    if (key === "C") return handleClear();
    if (key === "Valider") return handleValidate();
    if (key === "Reset") return handleReset();
    // pour éviter plusieurs séparateurs successifs
    setInput((prev) => prev + key);
  }

  // Supprime une valeur de la liste
  function removeValueAt(index: number) {
    setValues((prev) => prev.filter((_, i) => i !== index));
  }

  // Calcul des statistiques
  const moyenne = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;
  const ecartType =
    values.length > 1
      ? Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - (moyenne ?? 0), 2), 0) / (values.length - 1))
      : null;

  // Pavé numérique 3x4
  const padKeys = ["7","8","9","4","5","6","1","2","3","0",",","."];

  return (
    <div className="p-4 rounded-xl border bg-white shadow max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-3">Calculatrice Statistique</h2>

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
        {/* Numeric pad 3x4 */}
        <div className="grid grid-cols-3 gap-2 w-fit">
          {padKeys.map((k) => (
            <button
              key={k}
              type="button"
              className="w-16 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 text-lg font-medium"
              onClick={() => handlePadClick(k)}
            >
              {k}
            </button>
          ))}
        </div>

        {/* colonne d'actions */}
        <div className="flex flex-col gap-2 w-28">
          <button
            type="button"
            className="w-full h-12 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
            onClick={handleBackspace}
            disabled={input.length === 0}
            title="Backspace"
          >
            ⌫
          </button>
          <button
            type="button"
            className="w-full h-12 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
            onClick={handleClear}
            disabled={input.length === 0}
          >
            C
          </button>
          <button
            type="button"
            className="w-full h-12 rounded-lg bg-black text-white font-bold"
            onClick={handleValidate}
            disabled={input.trim() === ""}
          >
            Valider
          </button>
          <button
            type="button"
            className="w-full h-12 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
            onClick={handleReset}
            disabled={values.length === 0}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Valeurs séparées en lecture simple */}
      {values.length > 0 && (
        <div className="mb-3">
          <div className="text-sm text-gray-600 mb-1">Valeurs (séparées) :</div>
          <div className="mb-2 text-sm text-gray-800 break-words">{values.join(" ")}</div>

          {/* pills : flex wrap avec overflow horizontal possible */}
          <div className="flex gap-3 p-2 bg-gray-50 rounded border overflow-x-auto">
            {values.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => removeValueAt(i)}
                title="Cliquez pour supprimer"
                className="flex-none px-3 py-1 bg-gray-200 rounded-md font-mono text-base hover:bg-red-100"
              >
                {v}
              </button>
            ))}
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
    </div>
  );
}