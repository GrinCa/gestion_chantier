import React, { useState } from "react";

/*
  OutilCalculatriceMoyenne :
  - Pavé numérique 3x4 (boutons en grille, w-full pour chaque cellule)
  - Colonne d'actions verticale (⌫, C, Valider, Reset)
  - Affichage des valeurs : ligne "séparée" + pills flex avec gap et overflow-x-auto
  - Suppression d'une valeur en cliquant sur sa pill
*/

export function OutilCalculatriceMoyenne() {
  const [input, setInput] = useState("");
  const [values, setValues] = useState<number[]>([]);

  function parseInput(str: string): number | null {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function handleValidate() {
    const n = parseInput(input);
    if (n == null) return;
    setValues((prev) => [...prev, n]);
    setInput("");
  }

  function handleClear() {
    setInput("");
  }

  function handleReset() {
    setValues([]);
    setInput("");
  }

  function handleBackspace() {
    setInput((s) => s.slice(0, -1));
  }

  function handlePadClick(key: string) {
    if (key === "⌫") return handleBackspace();
    if (key === "C") return handleClear();
    if (key === "Valider") return handleValidate();
    if (key === "Reset") return handleReset();
    // pour éviter plusieurs séparateurs successifs
    setInput((prev) => prev + key);
  }

  function removeValueAt(index: number) {
    setValues((prev) => prev.filter((_, i) => i !== index));
  }

  // Stats
  const moyenne = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;
  const ecartType =
    values.length > 1
      ? Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - (moyenne ?? 0), 2), 0) / (values.length - 1))
      : null;

  // disposition pad 3x4
  const padKeys = ["7","8","9","4","5","6","1","2","3","0",",","."];

  return (
    <div className="p-4 rounded-xl border bg-white shadow max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-3">Calculatrice Statistique</h2>

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

