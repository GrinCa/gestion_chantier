import React, { useState, useCallback } from 'react';
import { useCalculatriceAdvanced } from '../../../hooks/useCalculatriceAdvanced';
import type { Projet } from '../../../api/users';

/**
 * CalculatriceUI (fusion hook + interface visuelle)
 * -------------------------------------------------
 * Cette version remplace progressivement l'ancienne implémentation massive (OutilMesureMultiRef)
 * en s'appuyant uniquement sur le hook `useCalculatriceAdvanced` (qui lui utilise le core).
 *
 * Objectifs:
 *  - Garder une interface visuelle proche de l'existant
 *  - Supprimer toute logique métier / recalcul locale
 *  - Faciliter future factorisation (mobile / autres outils)
 */

interface CalculatriceUIProps {
  selectedProject: Projet | null;
}

const LABELS_PREDEFINIS = [
  'Porte','Baie vitree','Fenêtre','Cloison','Mur porteur','Placard','Radiateur','Escalier','Autre'
] as const;

export const CalculatriceUI: React.FC<CalculatriceUIProps> = ({ selectedProject }) => {
  const hook = useCalculatriceAdvanced({ projectId: selectedProject?.id });
  const {
    groups,
    currentGroup,
    currentSection,
    currentGroupId,
    currentSectionId,
    setCurrentGroupId,
    setCurrentSectionId,
    addGroupe,
    removeGroupe,
    addSection,
    removeSection,
    renameSection,
    addMesure,
    removeMesure,
    toggleRefToPrev,
    toggleRefToNext,
    toggleIncludeInStats,
    setMesureLabel,
    flattened,
    globalStats,
    statsReferenceMesureId,
    setStatsReferenceMesureId,
    isLastGroup,
    lastError,
    clearError
  } = hook;

  // UI local ephemeral state
  const [padInput, setPadInput] = useState('');
  const [showControlsForMesure, setShowControlsForMesure] = useState<string | null>(null);
  const [pendingLabels, setPendingLabels] = useState<Record<string, string>>({});
  const [candidateReferenceId, setCandidateReferenceId] = useState<string | null>(null);
  // Dev helper visibility
  const [showCodePanel, setShowCodePanel] = useState(false);

  // Build vscode file URI (Windows path -> forward slashes)
  const toVsCodeUri = (absPath: string, line?: number, col?: number) => {
    const normalized = absPath.replace(/\\/g, '/');
    return `vscode://file/${normalized}${line ? `:${line}${col ? `:${col}` : ''}` : ''}`;
  };

  // Liste des fichiers pertinents (ajoute / ajuste les numéros si besoin)
  const codeLinks = [
    { label: 'UI (ce fichier)', path: 'c:/Users/Julien/Documents/Script/gestion_chantier/packages/web/src/components/outils/calculatrice/CalculatriceUI.tsx' },
    { label: 'Hook avancé', path: 'c:/Users/Julien/Documents/Script/gestion_chantier/packages/web/src/hooks/useCalculatriceAdvanced.ts' },
    { label: 'Hook simple', path: 'c:/Users/Julien/Documents/Script/gestion_chantier/packages/web/src/hooks/useCalculatrice.tsx' },
    { label: 'Core Tool', path: 'c:/Users/Julien/Documents/Script/gestion_chantier/packages/core/tools/calculatrice/CalculatriceTool.ts' },
    { label: 'Core Engine', path: 'c:/Users/Julien/Documents/Script/gestion_chantier/packages/core/tools/calculatrice/CalculatriceEngine.ts' },
    { label: 'Core DataManager', path: 'c:/Users/Julien/Documents/Script/gestion_chantier/packages/core/tools/calculatrice/CalculatriceDataManager.ts' },
    { label: 'Types', path: 'c:/Users/Julien/Documents/Script/gestion_chantier/packages/core/tools/calculatrice/types.ts' }
  ];

  // ===== Helpers =====
  const parsePad = useCallback((s: string): number | null => {
    if (!s.trim()) return null;
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }, []);

  const handleAddMesure = () => {
    const n = parsePad(padInput);
    if (n == null) return;
    const res = addMesure(n);
    if (res && 'error' in res) return;
    setPadInput('');
  };

  const padRows = [['7','8','9'],['4','5','6'],['1','2','3'],['0',',','C']];
  const onPad = (k: string) => {
    if (k === 'C') { setPadInput(''); return; }
    setPadInput(p => p + k);
  };

  const currentGroupIndex = groups.findIndex(g => g.id === currentGroupId);

  if (!selectedProject) {
    return (
      <div className="p-4 rounded-xl border bg-white shadow max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h2 className="text-xl font-bold mb-2">Aucun projet sélectionné</h2>
          <p className="text-gray-600">Sélectionnez ou créez un projet pour commencer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border bg-white shadow max-w-7xl mx-auto flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 relative">
        <div>
          <h2 className="text-xl font-bold">Mesures multi-références</h2>
          <div className="text-sm text-gray-600">📁 {selectedProject.nom}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const label = window.prompt('Nom de la position ?', `Position ${groups.length + 1}`);
              if (!label) return;
              addGroupe(label);
            }}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >+ Position</button>
          <button
            onClick={() => {
              if (!currentGroupId) return;
              if (!window.confirm('Supprimer cette position ?')) return;
              removeGroupe(currentGroupId);
            }}
            disabled={!currentGroupId || groups.length <= 1}
            className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
          >Supprimer</button>
          {import.meta.env.DEV && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCodePanel(v => !v)}
                className="px-3 py-1 text-sm rounded bg-gray-700 text-white hover:bg-gray-800"
                title="Ouvrir les fichiers sources dans VS Code"
              ></button>
              {showCodePanel && (
                <div className="absolute right-0 mt-2 z-50 w-72 max-h-96 overflow-auto bg-white border shadow-lg rounded-md p-2 text-xs">
                  <div className="flex items-center justify-between mb-1 font-semibold text-gray-700">
                    <span>Teleport Code (VS Code)</span>
                    <button onClick={() => setShowCodePanel(false)} className="text-gray-500 hover:text-black">✕</button>
                  </div>
                  <p className="mb-2 text-[10px] text-gray-500 leading-snug">Clique sur un lien pour ouvrir le fichier dans VS Code (schéma vscode://). Confirme l'ouverture si le navigateur demande.</p>
                  <ul className="space-y-1">
                    {codeLinks.map(link => (
                      <li key={link.path}>
                        <a
                          href={toVsCodeUri(link.path)}
                          className="block px-2 py-1 rounded hover:bg-gray-100 text-blue-600 break-all"
                          onClick={() => setShowCodePanel(false)}
                        >{link.label}</a>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t text-[10px] text-gray-500">Ajuster les chemins si ton dossier a changé.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {lastError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex justify-between">
          <span>{lastError}</span>
          <button onClick={clearError} className="text-xs px-2 py-0.5 bg-red-100 rounded">OK</button>
        </div>
      )}

      {/* Zone de saisie (num pad) */}
      {currentGroup && currentSection && (
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-600">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="font-semibold text-blue-900">Saisie pour {currentGroup.label}</h3>
            <input
              readOnly
              value={padInput}
              placeholder="Nouvelle mesure"
              className="border rounded-lg px-6 py-4 text-right font-mono text-2xl bg-white flex-1 min-w-[320px] max-w-[480px]"
            />
          </div>
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-center">
            <div className="flex flex-col gap-2">
              {padRows.map((row, i) => (
                <div key={i} className="flex gap-2 justify-center">
                  {row.map(k => (
                    <button
                      key={k}
                      onClick={() => onPad(k)}
                      className={`w-24 h-20 rounded-xl font-bold text-4xl shadow border ${k==='C' ? 'bg-gray-200 border-gray-400 hover:bg-gray-300' : 'bg-white border-blue-300 hover:bg-blue-100'}`}
                    >{k}</button>
                  ))}
                </div>
              ))}
              <div className="flex justify-center mt-2">
                <button
                  onClick={handleAddMesure}
                  disabled={!padInput.trim()}
                  className="w-52 h-14 rounded-lg font-bold text-xl border-2 transition-colors disabled:opacity-40 bg-green-500 text-white border-green-600 hover:bg-green-600"
                >Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des positions */}
      {groups.length === 0 && (
        <div className="text-center py-8 text-gray-500">Aucune position — créez-en une.</div>
      )}

      {groups.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((g, gi) => {
            const isCurrent = g.id === currentGroupId;
            return (
              <div
                key={g.id}
                className={`rounded-xl p-4 transition-all ${isCurrent ? 'bg-blue-50 shadow-lg scale-[1.02]' : 'bg-white hover:shadow-md'}`}
                style={{ border: isCurrent ? '3px solid #3b82f6' : '2px solid #6b7280' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => { setCurrentGroupId(g.id); setCurrentSectionId(g.sections[0]?.id || null); }}
                    className={`font-bold text-lg truncate ${isCurrent ? 'text-blue-700' : 'text-gray-800 hover:text-blue-600'}`}
                    title={g.label}
                  >{g.label}</button>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => {
                        const label = window.prompt('Nom de la section ?', `Section ${g.sections.length + 1}`);
                        if (label) addSection(g.id, label);
                      }}
                      className="text-blue-500 hover:text-blue-700 text-xs"
                    >+ Section</button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {g.sections.map((section, si) => {
                    const sectionActive = section.id === currentSectionId && isCurrent;
                    return (
                      <div
                        key={section.id}
                        className={`rounded-lg border ${sectionActive ? 'bg-green-50 border-green-400 shadow' : 'bg-white border-gray-200'}`}
                      >
                        <div
                          className={`flex items-center justify-between text-sm font-bold px-3 py-2 ${sectionActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}
                        >
                          <button
                            onClick={() => { setCurrentGroupId(g.id); setCurrentSectionId(section.id); }}
                            onDoubleClick={() => {
                              const nl = window.prompt('Renommer la section', section.label);
                              if (nl && nl.trim()) renameSection(g.id, section.id, nl.trim());
                            }}
                            className="flex-1 text-left hover:underline"
                          >{section.label === `Section ${si + 1}` ? 'Section' : section.label}</button>
                          {g.sections.length > 1 && (
                            <button
                              onClick={() => { if (window.confirm('Supprimer cette section ?')) removeSection(g.id, section.id); }}
                              className="text-red-200 hover:text-white text-xs ml-2"
                              title="Supprimer section"
                            >✕</button>
                          )}
                        </div>
                        <div className="p-3">
                          {/* Mesures */}
                          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                            {section.mesures.length === 0 && (
                              <div className="w-full text-center text-gray-400 text-xs italic py-2">Aucune mesure</div>
                            )}
                            {section.mesures.map(m => {
                              const isRefPrev = g.refToPrevId === m.id;
                              const isRefNext = g.refToNextId === m.id;
                              const isSelected = showControlsForMesure === m.id;
                              const include = m.includeInStats === undefined ? true : m.includeInStats;
                              return (
                                <div key={m.id} className="flex flex-col w-20">
                                  <button
                                    onClick={() => setShowControlsForMesure(p => p === m.id ? null : m.id)}
                                    className={`font-mono text-sm font-semibold rounded px-1 py-1 border relative transition-colors ${include ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                                    title="Clique: détails / actions"
                                  >
                                    {isRefPrev && <span className="absolute left-1 top-0 text-xs text-blue-600">↑</span>}
                                    {m.raw}
                                    {isRefNext && <span className="absolute right-1 bottom-0 text-xs text-green-600">↓</span>}
                                  </button>
                                  {m.label && (
                                    <span className="text-[10px] text-purple-600 text-center truncate">📌{m.label}</span>
                                  )}
                                  {isSelected && (
                                    <div className="flex flex-col gap-1 mt-1 bg-gray-50 p-1 rounded border">
                                      <button
                                        onClick={() => toggleIncludeInStats(g.id, m.id)}
                                        className="text-[11px] px-1 py-0.5 rounded bg-white border hover:bg-gray-100"
                                      >{include ? 'Exclure stats' : 'Inclure stats'}</button>
                                      <button
                                        onClick={() => toggleRefToPrev(g.id, m.id)}
                                        className={`text-[11px] px-1 py-0.5 rounded border ${isRefPrev ? 'bg-blue-200' : 'bg-white hover:bg-blue-50'}`}
                                      >Ref ↑</button>
                                      <button
                                        onClick={() => toggleRefToNext(g.id, m.id)}
                                        disabled={!isLastGroup(g.id)}
                                        className={`text-[11px] px-1 py-0.5 rounded border ${isRefNext ? 'bg-green-200' : 'bg-white hover:bg-green-50'} disabled:opacity-40`}
                                      >Ref ↓</button>
                                      <button
                                        onClick={() => { if (window.confirm('Supprimer mesure ?')) removeMesure(g.id, m.id); setShowControlsForMesure(null); }}
                                        className="text-[11px] px-1 py-0.5 rounded border bg-red-100 hover:bg-red-200 text-red-700"
                                      >Supprimer</button>
                                      {/* Label editing */}
                                      <div className="flex flex-col gap-1">
                                        <input
                                          value={pendingLabels[m.id] ?? m.label ?? ''}
                                          onChange={e => setPendingLabels(pl => ({ ...pl, [m.id]: e.target.value }))}
                                          placeholder="Label…"
                                          className="border rounded px-1 py-0.5 text-[11px]"
                                        />
                                        <div className="flex gap-1 flex-wrap">
                                          {LABELS_PREDEFINIS.map(l => (
                                            <button
                                              key={l}
                                              onClick={() => setPendingLabels(pl => ({ ...pl, [m.id]: l }))}
                                              className="text-[10px] px-1 py-0.5 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200"
                                            >{l}</button>
                                          ))}
                                        </div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => { const val = (pendingLabels[m.id] ?? '').trim(); setMesureLabel(g.id, m.id, val || null); setPendingLabels(pl => { const c = { ...pl }; delete c[m.id]; return c; }); }}
                                            className="flex-1 text-[11px] bg-green-600 text-white rounded px-1 py-0.5"
                                          >OK</button>
                                          {m.label && (
                                            <button
                                              onClick={() => { setMesureLabel(g.id, m.id, null); setPendingLabels(pl => { const c = { ...pl }; delete c[m.id]; return c; }); }}
                                              className="text-[11px] bg-red-500 text-white rounded px-1 py-0.5"
                                            >X</button>
                                          )}
                                        </div>
                                      </div>
                                      {/* Stats reference candidate */}
                                      <div className="flex items-center gap-1 mt-1">
                                        <input
                                          type="checkbox"
                                          checked={candidateReferenceId === m.id}
                                          onChange={e => setCandidateReferenceId(e.target.checked ? m.id : null)}
                                          className="w-3 h-3"
                                        />
                                        <span className="text-[10px]">Candid. ref stats</span>
                                        {candidateReferenceId === m.id && (
                                          <button
                                            onClick={() => { setStatsReferenceMesureId(m.id); setCandidateReferenceId(null); }}
                                            className="text-[10px] px-1 py-0.5 bg-purple-500 text-white rounded"
                                          >✓</button>
                                        )}
                                        {statsReferenceMesureId === m.id && (
                                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">REF</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tableau global */}
      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-green-50 via-blue-50 to-green-50 border-2 border-green-600">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-green-800">Valeurs globales consolidées</h3>
          <div className="px-2 py-1 bg-white rounded text-xs text-gray-600">{flattened.length} mesures</div>
        </div>
        {flattened.length === 0 && <div className="text-center text-gray-500 text-sm py-6">Aucune valeur (définir références pour la chaîne)</div>}
        {flattened.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-green-100 text-green-800">
                  <th className="border border-green-200 px-2 py-1 text-left">#</th>
                  <th className="border border-green-200 px-2 py-1 text-left">Position</th>
                  <th className="border border-green-200 px-2 py-1 text-left">Section</th>
                  <th className="border border-green-200 px-2 py-1 text-left">Brut</th>
                  <th className="border border-green-200 px-2 py-1 text-left">Global</th>
                  <th className="border border-green-200 px-2 py-1 text-left">Label</th>
                  <th className="border border-green-200 px-2 py-1">Stat</th>
                  <th className="border border-green-200 px-2 py-1">Réf</th>
                </tr>
              </thead>
              <tbody>
                {flattened.map((r,i) => {
                  const highlighted = showControlsForMesure === r.mesureId;
                  return (
                    <tr
                      key={r.mesureId}
                      className={highlighted ? 'bg-yellow-50' : ''}
                      onClick={() => setShowControlsForMesure(p => p === r.mesureId ? null : r.mesureId)}
                      title="Clique pour localiser la mesure"
                    >
                      <td className="border border-green-200 px-2 py-1">{i+1}</td>
                      <td className="border border-green-200 px-2 py-1">{r.groupLabel}</td>
                      <td className="border border-green-200 px-2 py-1">{r.sectionLabel}</td>
                      <td className="border border-green-200 px-2 py-1 font-mono">{r.raw}</td>
                      <td className="border border-green-200 px-2 py-1 font-mono text-green-700">{r.globalValue ?? '—'}</td>
                      <td className="border border-green-200 px-2 py-1 text-purple-700">{r.label || ''}</td>
                      <td className="border border-green-200 px-2 py-1 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleIncludeInStats(r.groupId, r.mesureId); }}
                          className={`px-2 py-0.5 rounded ${r.includeInStats ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >{r.includeInStats ? '✓' : '✗'}</button>
                      </td>
                      <td className="border border-green-200 px-2 py-1 text-center">
                        <input
                          type="radio"
                          name="ref"
                          checked={statsReferenceMesureId === r.mesureId}
                          onChange={(e) => { e.stopPropagation(); setStatsReferenceMesureId(r.mesureId); }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      {globalStats && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 border-2 border-purple-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg text-purple-800">Statistiques globales</h3>
            {globalStats.ref != null && (
              <div className="text-xs text-purple-700 flex items-center gap-2">
                <span>Référence: {globalStats.ref}</span>
                <button
                  onClick={() => setStatsReferenceMesureId(null)}
                  className="px-2 py-0.5 bg-purple-200 rounded text-purple-900 text-[11px]"
                >Retirer</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-white p-3 rounded border"><div className="text-gray-500 text-xs">Moyenne</div><div className="font-mono text-lg">{globalStats.moyenne.toFixed(2)}</div></div>
            <div className="bg-white p-3 rounded border"><div className="text-gray-500 text-xs">Min</div><div className="font-mono text-lg">{globalStats.min.toFixed(2)}</div></div>
            <div className="bg-white p-3 rounded border"><div className="text-gray-500 text-xs">Max</div><div className="font-mono text-lg">{globalStats.max.toFixed(2)}</div></div>
            <div className="bg-white p-3 rounded border"><div className="text-gray-500 text-xs">N</div><div className="font-mono text-lg">{globalStats.count}</div></div>
            {globalStats.adjusted && (
              <div className="col-span-2 md:col-span-4 mt-2">
                <div className="text-xs font-semibold text-purple-700 mb-1">Ajusté (réf = point zéro)</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded border"><div className="text-gray-500 text-xs">Moyenne*</div><div className="font-mono text-lg">{globalStats.adjusted.moyenne.toFixed(2)}</div></div>
                  <div className="bg-white p-3 rounded border"><div className="text-gray-500 text-xs">Min*</div><div className="font-mono text-lg">{globalStats.adjusted.min.toFixed(2)}</div></div>
                  <div className="bg-white p-3 rounded border"><div className="text-gray-500 text-xs">Max*</div><div className="font-mono text-lg">{globalStats.adjusted.max.toFixed(2)}</div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatriceUI;
