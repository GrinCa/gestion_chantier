/**
 * Projet : Carnet de Niveaux Laser (Application Web React)
 *
 * Objectif :
 * -----------
 * Application web pour saisir et sauvegarder des mesures de niveaux laser sur chantier.
 * Elle permet de prendre des hauteurs relatives sol -> ligne laser,
 * de gerer plusieurs deplacements du laser (stations),
 * et de garder toutes les cotes dans un meme referentiel.
 *
 * Structure des donnees :
 * -----------------------
 * - Project : represente un chantier pour un client
 *   - clientName / projectName : identification
 *   - referenceLabel : nom du repere utilise (ex: borne, repere A)
 *   - referenceAbs : cote absolue de ce repere (optionnelle, ex: 100.00 m NGF)
 *   - units : unites d'affichage (m, cm, mm)
 *   - stations[] : liste des positions successives du laser
 *   - points[] : liste des points mesures
 *
 * - Station : correspond a une installation du laser
 *   - index : numero de la station (1,2,3...)
 *   - refReading : lecture brute sur la reference a cette station
 *   - cumulativeOffset : somme des deltas entre stations, pour garder la coherence globale
 *   - note : commentaire libre (ex: "laser pose salon")
 *
 * - Point : correspond a une mesure sur chantier
 *   - name : nom du point (ex: coin A, mur nord...)
 *   - rawReading : lecture brute sol -> ligne laser
 *   - stationIndex : station ou la mesure a ete faite
 *   - correctedRel : cote relative (lecture_ref_effective - lecture_point)
 *   - correctedAbs : cote absolue si une reference absolue est definie
 *
 * Sauvegarde :
 * ------------
 * - Tout est stocke dans localStorage du navigateur sous forme JSON.
 * - Export CSV disponible pour extraction.
 *
 * Calculs :
 * ---------
 * - A chaque nouvelle station : on lit la reference, on calcule le delta par rapport a la precedente.
 * - Le delta cumule est applique automatiquement a toutes les nouvelles mesures.
 * - Cote relative = (lecture_ref_effective - lecture_point)
 * - Cote absolue = referenceAbs + correctedRel (si referenceAbs defini)
 *
 * UI (React) :
 * ------------
 * - Liste des chantiers
 * - Fiche chantier avec :
 *   - gestion des stations laser
 *   - ajout de points
 *   - tableau de mesures
 *   - export CSV
 *
 * Resume :
 * --------
 * Cette app est un carnet numerique simple, offline-first, pour suivre
 * les niveaux laser sur chantier, meme en cas de deplacements multiples du laser.
 */


import { useEffect, useMemo, useState } from "react";

// --- Types ---
type Station = {
  index: number; // 1-based
  refReading: number; // reading on the reference at this station (e.g., floor->laser in m)
  cumulativeOffset: number; // delta relative to station 1: sum(ref_i - ref_{i-1})
  createdAt: string; // ISO
  note?: string;
};

type Point = {
  id: string;
  name: string;
  rawReading: number; // floor->laser at the point, in same units as ref
  stationIndex: number; // station where it was measured
  correctedRel: number; // relative cote = effectiveRef - rawReading
  correctedAbs?: number; // absolute cote if referenceAbs is set
  createdAt: string; // ISO
};

type Project = {
  id: string;
  clientName: string;
  projectName: string;
  referenceLabel: string; // e.g., "Repère A"
  referenceAbs?: number | null; // optional absolute cote of the reference (e.g., NGF). If null, show only relative.
  units: "m" | "cm" | "mm"; // display units
  stations: Station[];
  points: Point[];
  createdAt: string;
  updatedAt: string;
};

// --- Utils ---
const LS_KEY = "laser-level-notebook:v1";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

function parseNum(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/*
function _fmt(n: number, units: Project["units"], digits = 2): string {
  const f = n.toFixed(digits);
  return `${f} ${units}`;
}
*/

// Conversion functions removed: no more multiplication/division for units
function convertToUnits(value: number, units: Project["units"]): number {
  // No conversion, just return the value as entered
  return value;
}

function convertFromUnits(value: number, units: Project["units"]): number {
  // No conversion, just return the value as entered
  return value;
}

// Export CSV
function toCSV(project: Project): string {
  const header = [
    "Client",
    "Chantier",
    "Reference",
    "Cote absolue de reference",
    "Unité",
    "Station",
    "Lecture ref",
    "Offset cumule",
    "Point",
    "Lecture brute",
    "Cote relative",
    "Cote absolue",
    "Horodatage point",
  ];

  const rows: string[] = [];
  for (const p of project.points) {
    const st = project.stations.find((s) => s.index === p.stationIndex)!;
    rows.push([
      project.clientName,
      project.projectName,
      project.referenceLabel,
      project.referenceAbs ?? "",
      project.units,
      st.index,
      st.refReading,
      st.cumulativeOffset,
      p.name,
      p.rawReading,
      p.correctedRel,
      p.correctedAbs ?? "",
      p.createdAt,
    ]
      .map((v) => `"${String(v).replaceAll("\"", "\"\"")}"`)
      .join(","));
  }

  return [header.join(","), ...rows].join("\n");
}

// --- Storage hooks ---
function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Project[]) : [];
    } catch (e) {
      console.warn("Failed to parse local storage", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(projects));
  }, [projects]);

  function createProject(partial?: Partial<Project>) {
    const now = new Date().toISOString();
    const project: Project = {
      id: uid("prj"),
      clientName: partial?.clientName ?? "Client (à renseigner)",
      projectName: partial?.projectName ?? "Chantier",
      referenceLabel: partial?.referenceLabel ?? "Repère",
      referenceAbs: partial?.referenceAbs ?? null,
      units: partial?.units ?? "m",
      stations: [],
      points: [],
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [project, ...prev]);
    return project.id;
  }

  function updateProject(id: string, patch: Partial<Project>) {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p))
    );
  }

  function deleteProject(id: string) {
    if (!confirm("Supprimer ce chantier ?")) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return { projects, createProject, updateProject, deleteProject };
}

// --- UI ---
function HauteurLaserTool({ project, updateProject }: { project: Project; updateProject: (id: string, patch: Partial<Project>) => void }) {
  const [showReleve, setShowReleve] = useState(false);
  const [showCalculatrice, setShowCalculatrice] = useState(false);
  const [calcValues, setCalcValues] = useState<number[]>([]);
  const [calcInput, setCalcInput] = useState("");

  // Derived values
  const currentStation = project?.stations[project.stations.length - 1] ?? null;
  const firstStation = project?.stations[0] ?? null;

  function setUnits(units: Project["units"]) {
    updateProject(project.id, { units });
  }

  function displayed(value: number): string {
    return value.toFixed(2);
  }

  function parseDisplayed(valueStr: string): number | null {
    const n = parseNum(valueStr);
    return n;
  }

  function deleteLastStation() {
    if (project.stations.length === 0) return;
    const last = project.stations[project.stations.length - 1];
    const usedBy = project.points.filter((p) => p.stationIndex === last.index).length;
    if (usedBy > 0) {
      if (!confirm(`Supprimer la station ${last.index} et ${usedBy} point(s) associé(s) ?`)) return;
      const remainingPoints = project.points.filter((p) => p.stationIndex !== last.index);
      updateProject(project.id, { stations: project.stations.slice(0, -1), points: remainingPoints });
    } else {
      if (!confirm(`Supprimer la station ${last.index} ?`)) return;
      updateProject(project.id, { stations: project.stations.slice(0, -1) });
    }
  }

  function addStation(refReadingInput: string, note?: string) {
    if (!project) return;
    const ref = parseNum(refReadingInput);
    if (ref == null) {
      alert("Lecture sur la référence invalide");
      return;
    }
    const last = project.stations[project.stations.length - 1];
    const cumulativeOffset = last ? last.cumulativeOffset + (ref - last.refReading) : 0;
    const station: Station = {
      index: (last?.index ?? 0) + 1,
      refReading: ref,
      cumulativeOffset,
      createdAt: new Date().toISOString(),
      note,
    };
    updateProject(project.id, { stations: [...project.stations, station] });
  }

  function addPoint(name: string, rawReadingInput: string) {
    if (!project) return;
    if (!currentStation || !firstStation) {
      alert("Commence par créer une station (lecture sur la reference)");
      return;
    }
    const raw = parseNum(rawReadingInput);
    if (raw == null) {
      alert("Lecture brute invalide");
      return;
    }
    // Effective reference reading at this station, expressed relative to station 1:
    const effectiveRef = firstStation.refReading + currentStation.cumulativeOffset; // equals currentStation.refReading

    const correctedRel = effectiveRef - raw; // Δ vs référence (même station OK)
    const correctedAbs = project.referenceAbs != null ? project.referenceAbs + correctedRel : undefined;

    const point: Point = {
      id: uid("pt"),
      name: name || `Point ${project.points.length + 1}`,
      rawReading: raw,
      stationIndex: currentStation.index,
      correctedRel,
      correctedAbs,
      createdAt: new Date().toISOString(),
    };

    updateProject(project.id, { points: [...project.points, point] });
  }

  function removePoint(id: string) {
    updateProject(project.id, { points: project.points.filter((p) => p.id !== id) });
  }

  function movePointToStation(id: string, stationIndex: number) {
    const p = project.points.find((x) => x.id === id);
    const st = project.stations.find((s) => s.index === stationIndex);
    if (!p || !st || !project.stations.length) return;
    const first = project.stations[0];
    const effectiveRef = first.refReading + st.cumulativeOffset;
    const correctedRel = effectiveRef - p.rawReading;
    const correctedAbs = project.referenceAbs != null ? project.referenceAbs + correctedRel : undefined;
    updateProject(project.id, {
      points: project.points.map((x) => (x.id === id ? { ...x, stationIndex, correctedRel, correctedAbs } : x)),
    });
  }

  function handlePadClick(val: string) {
    setCalcInput((prev) => prev + val);
  }
  function handlePadClear() {
    setCalcInput("");
  }
  function handlePadBackspace() {
    setCalcInput((prev) => prev.slice(0, -1));
  }
  function handlePadValidate() {
    const n = parseNum(calcInput);
    if (n == null) return;
    setCalcValues([...calcValues, n]);
    setCalcInput("");
  }
  function resetCalcValues() {
    setCalcValues([]);
    setCalcInput("");
  }

  const calcMoyenne = calcValues.length > 0
    ? (calcValues.reduce((a, b) => a + b, 0) / calcValues.length)
    : null;

  return (
    <div className="space-y-6">
      {/* En-tête chantier */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <LabeledInput
          label="Client"
          value={project.clientName}
          onChange={(v) => updateProject(project.id, { clientName: v })}
        />
        <LabeledInput
          label="Chantier"
          value={project.projectName}
          onChange={(v) => updateProject(project.id, { projectName: v })}
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="text-lg font-bold">{project.clientName}</div>
          <div className="text-md text-gray-600">{project.projectName}</div>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-xl bg-black text-white"
            onClick={() => setShowReleve((v) => !v)}
          >
            Relevé de cotes
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-blue-700 text-white"
            onClick={() => setShowCalculatrice((v) => !v)}
          >
            Calculatrice moyenne
          </button>
        </div>
      </div>
      {showCalculatrice && (
        <div className="p-3 rounded-xl border border-gray-200 mb-4 max-w-xs">
          <div className="font-semibold mb-2">Calculatrice de moyenne</div>
          <div className="mb-2">
            <input
              className="border rounded-xl px-3 py-2 w-full text-right text-lg"
              value={calcInput}
              placeholder="Saisir une valeur"
              readOnly
            />
          </div>
          {/* Pavé numérique classique */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Ligne 1 */}
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("7")}>7</button>
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("8")}>8</button>
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("9")}>9</button>
            {/* Ligne 2 */}
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("4")}>4</button>
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("5")}>5</button>
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("6")}>6</button>
            {/* Ligne 3 */}
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("1")}>1</button>
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("2")}>2</button>
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("3")}>3</button>
            {/* Ligne 4 */}
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick("0")}>0</button>
            <button className="px-4 py-3 rounded-xl bg-gray-100 text-lg" onClick={() => handlePadClick(".")}>.</button>
            <span></span>
          </div>
          <div className="flex gap-2 mb-2">
            <button
              className="px-3 py-2 rounded-xl bg-gray-200"
              onClick={handlePadBackspace}
              disabled={calcInput.length === 0}
            >
              ⌫
            </button>
            <button
              className="px-3 py-2 rounded-xl bg-gray-200"
              onClick={handlePadClear}
              disabled={calcInput.length === 0}
            >
              C
            </button>
            <button
              className="px-3 py-2 rounded-xl bg-black text-white"
              onClick={handlePadValidate}
              disabled={calcInput.trim() === ""}
            >
              Valider
            </button>
            <button
              className="px-3 py-2 rounded-xl bg-gray-200"
              onClick={resetCalcValues}
              disabled={calcValues.length === 0}
            >
              Réinitialiser
            </button>
          </div>
          {calcValues.length > 0 && (
            <div className="mb-2">
              <div className="text-sm text-gray-600">Valeurs saisies :</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {calcValues.map((v, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 rounded">{v}</span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 font-bold">
            Moyenne :{" "}
            {calcMoyenne != null
              ? calcMoyenne.toFixed(2)
              : <span className="text-gray-400">-</span>
            }
          </div>
        </div>
      )}
      {showReleve && (
        <>
          {/* Meta (sans client/chantier) */}
          <div className="grid sm:grid-cols-2 gap-3">
            <LabeledInput
              label="Nom de la reference"
              value={project.referenceLabel}
              onChange={(v) => updateProject(project.id, { referenceLabel: v })}
            />
            <div>
              <label className="text-sm font-medium">Unite d'affichage</label>
              <div className="mt-1 flex gap-2">
                {["m", "cm", "mm"].map((u) => (
                  <button
                    key={u}
                    className={`px-3 py-1 rounded-xl border ${project.units === u ? "border-black" : "border-gray-300"}`}
                    onClick={() => setUnits(u as Project["units"])}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <LabeledInput
              label={`Cote absolue de la reference (${project.units}) - optionnel`}
              value={project.referenceAbs != null ? displayed(project.referenceAbs) : ""}
              onChange={(v) => {
                const parsed = parseDisplayed(v);
                updateProject(project.id, { referenceAbs: parsed });
              }}
              placeholder={`ex: 100.00`}
            />
          </div>
          {/* Stations */}
          <div className="p-3 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">Stations laser</div>
                <div className="text-sm text-gray-500">
                  {project.stations.length === 0
                    ? "Aucune station. Creez-en une en saisissant la lecture sur la reference."
                    : `Station actuelle : #${currentStation!.index} - lecture ref = ${displayed(
                        currentStation!.refReading
                      )} ${project.units}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded-xl border" onClick={deleteLastStation}>
                  Supprimer derniere station
                </button>
              </div>
            </div>
            <AddStationForm onAdd={(ref, note) => addStation(ref, note)} units={project.units} />
            {project.stations.length > 0 && (
              <div className="mt-4 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2">#</th>
                      <th>Lecture ref ({project.units})</th>
                      <th>Delta cumule ({project.units})</th>
                      <th>Date</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.stations.map((s) => (
                      <tr key={s.index} className="border-t">
                        <td className="py-1">{s.index}</td>
                        <td>{displayed(s.refReading)}</td>
                        <td>{displayed(s.cumulativeOffset)}</td>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                        <td className="max-w-[240px] truncate" title={s.note}>{s.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Add point */}
          <div className="p-3 rounded-xl border border-gray-200">
            <div className="font-semibold mb-2">Ajouter un point</div>
            <AddPointForm
              disabled={project.stations.length === 0}
              onAdd={(name, readingStr) => addPoint(name, readingStr)}
              units={project.units}
            />
          </div>
          {/* Points list */}
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Point</th>
                  <th>Station</th>
                  <th>Lecture brute ({project.units})</th>
                  <th>Delta relatif ({project.units})</th>
                  <th>Cote absolue {project.referenceAbs == null ? "(definir la reference)" : `(${project.units})`}</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {project.points.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td>
                      <select
                        className="border rounded px-2 py-1"
                        value={p.stationIndex}
                        onChange={(e) => movePointToStation(p.id, Number(e.target.value))}
                      >
                        {project.stations.map((s) => (
                          <option key={s.index} value={s.index}>
                            #{s.index}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{displayed(p.rawReading)}</td>
                    <td>{displayed(p.correctedRel)}</td>
                    <td>
                      {p.correctedAbs != null ? (
                        displayed(p.correctedAbs)
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-gray-500">{new Date(p.createdAt).toLocaleString()}</td>
                    <td>
                      <button className="text-red-600 hover:underline" onClick={() => removePoint(p.id)}>
                        Suppr.
                      </button>
                    </td>
                  </tr>
                ))}
                {project.points.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-500">
                      Aucun point.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function LaserLevelNotebook() {
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAccueil, setShowAccueil] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (projects.length > 0 && (selectedId == null || !projects.some(p => p.id === selectedId))) {
      setSelectedId(projects[0].id);
    }
  }, [projects, selectedId]);

  const filteredProjects = projects.filter(p =>
    p.clientName.toLowerCase().includes(search.toLowerCase()) ||
    p.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const project = useMemo(() => projects.find((p) => p.id === selectedId) ?? null, [projects, selectedId]);

  function exportCSV() {
    if (!project) return;
    const csv = toCSV(project);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = `${project.clientName}-${project.projectName}`.replace(/[^a-z0-9_-]+/gi, "_");
    a.download = `${safeName}-niveaux.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function resetProject() {
    if (!project) return;
    if (!confirm("Reinitialiser les stations et points de ce chantier ?")) return;
    updateProject(project.id, { stations: [], points: [] });
  }

  if (showAccueil) {
    return (
      <div className="min-h-screen w-full bg-gray-50 text-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Carnet de Niveaux Laser</h1>
          <div className="space-y-4">
            <input
              className="px-3 py-2 rounded-xl border bg-white shadow w-full"
              type="text"
              placeholder="Rechercher un chantier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <select
                className="px-3 py-2 rounded-xl border bg-white shadow"
                value={selectedId ?? ''}
                onChange={e => setSelectedId(e.target.value)}
                style={{ minWidth: 220 }}
              >
                <option value="" disabled>Selectionner un chantier...</option>
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.clientName} - {p.projectName}</option>
                ))}
              </select>
              {selectedId && (
                <button
                  className="px-3 py-2 rounded-2xl bg-white shadow hover:bg-gray-100 text-red-600 border"
                  onClick={() => deleteProject(selectedId)}
                >
                  Supprimer chantier
                </button>
              )}
            </div>
            <button
              className="px-4 py-2 rounded-xl bg-black text-white"
              onClick={() => {
                const id = createProject({ clientName: "Nouveau client", projectName: "Nouveau chantier" });
                setSelectedId(id);
              }}
            >+ Nouveau chantier</button>
            {selectedId && (
              <button className="px-4 py-2 rounded-xl bg-white border" onClick={() => setShowAccueil(false)}>
                Ouvrir le chantier sélectionné
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fiche chantier seule
  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Carnet de Niveaux Laser</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="px-3 py-2 rounded-2xl bg-white shadow hover:bg-gray-100" onClick={() => setShowAccueil(true)}>
              Retour accueil
            </button>
            {project && (
              <>
                <button className="px-3 py-2 rounded-2xl bg-white shadow hover:bg-gray-100" onClick={exportCSV}>
                  Export CSV
                </button>
                <button className="px-3 py-2 rounded-2xl bg-white shadow hover:bg-gray-100" onClick={resetProject}>
                  Reinitialiser
                </button>
                <button
                  className="px-3 py-2 rounded-2xl bg-white shadow hover:bg-gray-100"
                  onClick={() => deleteProject(project.id)}
                >
                  Supprimer chantier
                </button>
              </>
            )}
          </div>
        </header>
        <div className="bg-white p-4 rounded-2xl shadow">
          {project ? (
            <HauteurLaserTool project={project} updateProject={updateProject} />
          ) : (
            <div className="text-gray-500">Selectionne ou cree un chantier.</div>
          )}
        </div>
        <footer className="text-xs text-gray-500 mt-8">
          Astuce : la cote relative est calculee comme <code>lecture_ref - lecture_point</code>.
          Si tu definis une cote absolue de reference, l'app ajoute cette valeur a la cote relative.
          Le recalage multi-stations est gere automatiquement via le Delta cumule.
        </footer>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        className="mt-1 w-full border rounded-xl px-3 py-2"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function AddStationForm({ onAdd, units }: { onAdd: (refReading: string, note?: string) => void; units: Project["units"] }) {
  const [refReading, setRefReading] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-end">
      <div className="flex-1">
        <label className="text-sm font-medium">Lecture sur la reference ({units})</label>
        <input
          className="mt-1 w-full border rounded-xl px-3 py-2"
          value={refReading}
          placeholder={`ex: 1.25`}
          onChange={(e) => setRefReading(e.target.value)}
        />
      </div>
      <div className="flex-1">
        <label className="text-sm font-medium">Note (position laser, piece, etc.)</label>
        <input
          className="mt-1 w-full border rounded-xl px-3 py-2"
          value={note}
          placeholder="ex: Salon, proche baie vitree"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button
        className="px-4 py-2 rounded-xl bg-black text-white"
        onClick={() => {
          onAdd(refReading, note);
          setRefReading("");
          setNote("");
        }}
      >
        + Ajouter station
      </button>
    </div>
  );
}

function AddPointForm({ onAdd, units, disabled }: { onAdd: (name: string, reading: string) => void; units: Project["units"]; disabled?: boolean }) {
  const [name, setName] = useState("");
  const [reading, setReading] = useState("");
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-end">
      <div className="flex-1">
        <label className="text-sm font-medium">Nom du point</label>
        <input
          className="mt-1 w-full border rounded-xl px-3 py-2"
          value={name}
          placeholder="ex: Coin A"
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="flex-1">
        <label className="text-sm font-medium">Lecture brute ({units})</label>
        <input
          className="mt-1 w-full border rounded-xl px-3 py-2"
          value={reading}
          placeholder={`ex: 1.37`}
          onChange={(e) => setReading(e.target.value)}
          disabled={disabled}
        />
      </div>
      <button
        className={`px-4 py-2 rounded-xl ${disabled ? "bg-gray-300" : "bg-black text-white"}`}
        onClick={() => {
          if (disabled) return;
          onAdd(name, reading);
          setName("");
          setReading("");
        }}
      >
        + Ajouter point
      </button>
    </div>
  );
}
