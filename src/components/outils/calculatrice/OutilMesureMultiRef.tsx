import React, { useState, useEffect } from 'react';

// Types
export interface Mesure {
  id: string;
  raw: number;
  isRef: boolean;
  createdAt: number;
}

export interface GroupeMesures {
  id: string;
  label: string;
  mesures: Mesure[];
  refToPrevId?: string | null;
  refToNextId?: string | null;
  storedRelOffset?: number | null;
}

interface PersistShapeV1 { version: 1; groups: any[] }
interface PersistShapeV2 { version: 2; groups: GroupeMesures[] }
type PersistAny = PersistShapeV1 | PersistShapeV2;

// Utilitaires
function uuid() { 
  return (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2); 
}

const STORAGE_KEY = 'outil-multi-ref-v2';

export const OutilMesureMultiRef: React.FC = () => {
  // État initial
  const [groups, setGroups] = useState<GroupeMesures[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: PersistAny = JSON.parse(raw);
      if (!parsed || !('version' in parsed)) return [];
      if (parsed.version === 2) {
        return Array.isArray(parsed.groups) ? parsed.groups : [];
      }
      if (parsed.version === 1) {
        return (parsed.groups || []).map((g: any, idx: number): GroupeMesures => {
          const ref = Array.isArray(g.mesures) ? g.mesures.find((m: any) => m.isRef) : null;
          return {
            id: g.id || uuid(),
            label: g.label || `Position ${idx+1}`,
            mesures: Array.isArray(g.mesures) ? g.mesures.map((m: any) => ({
              id: m.id || uuid(),
              raw: m.raw ?? 0,
              isRef: !!m.isRef,
              createdAt: m.createdAt || Date.now()
            })) : [],
            refToPrevId: ref ? ref.id : null,
            refToNextId: ref ? ref.id : null,
            storedRelOffset: idx === 0 ? 0 : null
          };
        });
      }
      return [];
    } catch { return []; }
  });
  
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(groups[0]?.id || null);
  const [input, setInput] = useState('');

  useEffect(() => {
    const data: PersistShapeV2 = { version: 2, groups };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [groups]);

  const currentGroup = groups.find(g => g.id === currentGroupId) || null;

  // Fonctions de gestion des groupes
  function addGroup() {
    const label = prompt('Nom de la position ?', `Position ${groups.length + 1}`);
    if (!label) return;
    const g: GroupeMesures = { 
      id: uuid(), 
      label, 
      mesures: [], 
      refToPrevId: null, 
      refToNextId: null, 
      storedRelOffset: groups.length === 0 ? 0 : null 
    };
    setGroups(prev => [...prev, g]);
    setCurrentGroupId(g.id);
  }
  
  function deleteGroup(id: string) {
    if (!confirm('Supprimer cette position et ses mesures ?')) return;
    setGroups(prev => prev.filter(g => g.id !== id));
    if (currentGroupId === id) setCurrentGroupId(null);
  }
  
  function clearAll() {
    if (!confirm('Tout supprimer ?')) return;
    setGroups([]);
    setCurrentGroupId(null);
  }

  // Fonctions de gestion des mesures
  function parseInput(str: string): number | null {
    if (!str) return null;
    const n = Number(str.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  
  function addMesure() {
    if (!currentGroup) return;
    const n = parseInput(input);
    if (n == null) return;
    const m: Mesure = { id: uuid(), raw: n, isRef: false, createdAt: Date.now() };
    setGroups(prev => prev.map(g => g.id === currentGroup.id ? { ...g, mesures: [...g.mesures, m] } : g));
    setInput('');
  }
  
  function deleteMesure(groupId: string, mesureId: string) {
    if (!confirm('Supprimer cette mesure ?')) return;
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, mesures: g.mesures.filter(m => m.id !== mesureId) } : g));
  }

  // Recalcul de la chaîne
  function recalculateChain(updatedGroups: GroupeMesures[]): GroupeMesures[] {
    const result = [...updatedGroups];
    
    for (let i = 1; i < result.length; i++) {
      const prevG = result[i-1];
      const curG = result[i];
      
      const prevRefToNext = prevG.refToNextId ? prevG.mesures.find(m => m.id === prevG.refToNextId) : null;
      const curRefToPrev = curG.refToPrevId ? curG.mesures.find(m => m.id === curG.refToPrevId) : null;
      
      if (prevRefToNext && curRefToPrev) {
        curG.storedRelOffset = prevRefToNext.raw - curRefToPrev.raw;
      } else {
        curG.storedRelOffset = null;
        for (let j = i + 1; j < result.length; j++) {
          result[j].storedRelOffset = null;
        }
        break;
      }
    }
    
    return result;
  }

  function toggleRefToPrev(groupId: string, mesureId: string) {
    setGroups(prev => {
      const updated = prev.map(g => {
        if (g.id !== groupId) return g;
        const newRefToPrevId = g.refToPrevId === mesureId ? null : mesureId;
        return { ...g, refToPrevId: newRefToPrevId };
      });
      return recalculateChain(updated);
    });
  }

  function toggleRefToNext(groupId: string, mesureId: string) {
    setGroups(prev => {
      const updated = prev.map(g => {
        if (g.id !== groupId) return g;
        const newRefToNextId = g.refToNextId === mesureId ? null : mesureId;
        return { ...g, refToNextId: newRefToNextId };
      });
      return recalculateChain(updated);
    });
  }

  // Calculs
  function refToPrevOfGroup(g: GroupeMesures): number | null {
    if (!g.refToPrevId) return null;
    const r = g.mesures.find(m => m.id === g.refToPrevId);
    return r ? r.raw : null;
  }

  function refToNextOfGroup(g: GroupeMesures): number | null {
    if (!g.refToNextId) return null;
    const r = g.mesures.find(m => m.id === g.refToNextId);
    return r ? r.raw : null;
  }

  function globalOffsetOfIndex(idx: number): number | null {
    let sum = 0;
    for (let i = 0; i <= idx; i++) {
      const g = groups[i];
      if (i === 0) {
        if (!g.refToPrevId) return null;
        continue;
      }
      if (g.storedRelOffset == null) return null;
      sum += g.storedRelOffset;
    }
    return sum;
  }

  function globalOffsetOfGroup(g: GroupeMesures): number | null {
    const idx = groups.findIndex(x => x.id === g.id);
    if (idx === -1) return null;
    return globalOffsetOfIndex(idx);
  }

  function globalValue(raw: number, g: GroupeMesures): number | null {
    const off = globalOffsetOfGroup(g);
    if (off == null) return null;
    return raw + off;
  }

  const flattenedGlobal: number[] = [];
  groups.forEach((g) => {
    const off = globalOffsetOfGroup(g);
    if (off == null) return;
    g.mesures.forEach(m => {
      flattenedGlobal.push(m.raw + off);
    });
  });

  // Pavé numérique
  const padRows = [["7","8","9"],["4","5","6"],["1","2","3"],["0",",","."]];
  function handlePad(key: string){
    if(key==='⌫'){ setInput(s=>s.slice(0,-1)); return; }
    if(key==='C'){ setInput(''); return; }
    setInput(s=>s+key);
  }

  return (
    <div className="p-4 rounded-xl border bg-white shadow max-w-7xl mx-auto flex flex-col gap-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Mesures multi-références</h2>
        <div className="flex gap-2">
          <button 
            onClick={addGroup} 
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + Position
          </button>
          <button 
            onClick={clearAll} 
            disabled={!groups.length} 
            className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
          >
            Tout
          </button>
        </div>
      </div>

      {/* Zone de saisie en haut avec pavé numérique */}
      {currentGroup && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="font-semibold text-blue-900">Saisie pour {currentGroup.label}</h3>
            <input 
              readOnly 
              className="border rounded-lg px-3 py-2 text-right font-mono text-lg bg-white flex-1 max-w-xs" 
              value={input} 
              placeholder="Nouvelle mesure" 
            />
          </div>
          
          <div className="flex gap-6 items-start flex-wrap">
            {/* Pavé numérique en premier */}
            <div className="flex flex-col gap-2">
              {padRows.map((row,i)=>(
                <div key={i} className="flex gap-2">
                  {row.map(k=> (
                    <button 
                      key={k} 
                      className="rounded-lg bg-white hover:bg-blue-100 font-bold border border-blue-200 shadow-sm transition-colors" 
                      style={{width:'60px',height:'50px',fontSize:'1.5rem'}} 
                      onClick={()=>handlePad(k)}
                    >
                      {k}
                    </button>
                  ))}
                  {i===0 && (
                    <button 
                      className="rounded-lg bg-gray-200 hover:bg-gray-300 font-bold border shadow-sm transition-colors" 
                      style={{width:'60px',height:'50px',fontSize:'1.5rem'}} 
                      onClick={()=>handlePad('⌫')}
                    >
                      ⌫
                    </button>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <button 
                  className="rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold border shadow-sm transition-colors" 
                  style={{width:'60px',height:'40px'}} 
                  onClick={()=>handlePad('C')}
                >
                  C
                </button>
                <button 
                  className="rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold border shadow-sm transition-colors" 
                  style={{width:'128px',height:'40px'}} 
                  disabled={!input.trim()} 
                  onClick={addMesure}
                >
                  Ajouter
                </button>
              </div>
            </div>
            
            {/* Guide des références */}
            <div className="flex flex-col gap-3 text-xs text-blue-700 bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
              <div className="font-medium text-sm text-blue-900 mb-2">Guide des références</div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-bold text-lg">◀</span> 
                <span>Référence vers position précédente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold text-lg">▶</span> 
                <span>Référence vers position suivante</span>
              </div>
              <div className="text-[10px] text-gray-600 mt-2 italic">
                Cliquez sur les flèches après avoir ajouté des mesures
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message si pas de position */}
      {groups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg mb-2">Aucune position créée</div>
          <div className="text-sm">Cliquez sur "+ Position" pour commencer</div>
        </div>
      )}

      {/* Grille améliorée des positions */}
      {groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((g, idx) => {
            const isCurrent = g.id === currentGroupId;
            const globalOff = globalOffsetOfGroup(g);
            const refToPrev = refToPrevOfGroup(g);
            const refToNext = refToNextOfGroup(g);
            const relOff = idx > 0 ? g.storedRelOffset : 0;
            
            return (
              <div 
                key={g.id} 
                className={`border rounded-xl p-4 transition-all duration-200 ${
                  isCurrent 
                    ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105 ring-2 ring-blue-200' 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                }`}
              > 
                <div className="flex items-center justify-between mb-3">
                  <button 
                    className={`font-bold text-lg truncate ${
                      isCurrent 
                        ? 'text-blue-700' 
                        : 'text-gray-800 hover:text-blue-600'
                    }`} 
                    onClick={()=>setCurrentGroupId(g.id)}
                    title={g.label}
                  >
                    {g.label}
                  </button>
                  <button 
                    onClick={()=>deleteGroup(g.id)} 
                    className="text-red-500 hover:text-red-700 text-sm p-1 hover:bg-red-50 rounded" 
                    title="Supprimer cette position"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-blue-600 font-medium">← {refToPrev != null ? refToPrev : '—'}</div>
                    <div className="text-green-600 font-medium">→ {refToNext != null ? refToNext : '—'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-gray-700 font-medium">
                      Global: <span className="font-mono">{globalOff != null ? `${globalOff >= 0 ? '+' : ''}${globalOff}` : '—'}</span>
                    </div>
                    {idx > 0 && (
                      <div className="text-gray-600">
                        Relatif: <span className="font-mono">{relOff != null ? `${relOff >= 0 ? '+' : ''}${relOff}` : '—'}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {g.mesures.length === 0 && (
                    <div className="text-center text-gray-400 py-6 text-sm italic">
                      Aucune mesure
                    </div>
                  )}
                  {g.mesures.slice().reverse().map(m => {
                    const gv = globalValue(m.raw, g);
                    const isRefToPrev = g.refToPrevId === m.id;
                    const isRefToNext = g.refToNextId === m.id;
                    return (
                      <div 
                        key={m.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          (isRefToPrev || isRefToNext)
                            ? 'bg-amber-50 border-amber-200 shadow-sm'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-base font-semibold">{m.raw}</span>
                          {gv != null && <span className="text-xs text-blue-600 font-medium">= {gv}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={()=>toggleRefToPrev(g.id, m.id)} 
                            className={`text-lg px-2 py-1 rounded transition-colors ${
                              isRefToPrev 
                                ? 'text-blue-700 bg-blue-100' 
                                : 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'
                            }`} 
                            title="Référence vers position précédente"
                          >
                            {isRefToPrev ? '◀' : '◁'}
                          </button>
                          <button 
                            onClick={()=>toggleRefToNext(g.id, m.id)} 
                            className={`text-lg px-2 py-1 rounded transition-colors ${
                              isRefToNext 
                                ? 'text-green-700 bg-green-100' 
                                : 'text-green-400 hover:text-green-600 hover:bg-green-50'
                            }`} 
                            title="Référence vers position suivante"
                          >
                            {isRefToNext ? '▶' : '▷'}
                          </button>
                          <button 
                            onClick={()=>deleteMesure(g.id, m.id)} 
                            className="text-red-400 hover:text-red-600 text-sm ml-1 hover:bg-red-50 px-2 py-1 rounded transition-colors" 
                            title="Supprimer cette mesure"
                          >
                            ✕
                          </button>
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

      {/* Section des valeurs globales améliorée */}
      <div className="mt-6 p-6 border-2 border-green-200 rounded-xl bg-gradient-to-br from-green-50 via-blue-50 to-green-50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-xl text-green-800">Valeurs globales consolidées</h3>
          <div className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm">
            {flattenedGlobal.length} mesures
          </div>
        </div>
        
        {flattenedGlobal.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">Aucune valeur globale calculable</div>
            <div className="text-sm">Définissez des références dans vos positions pour voir les valeurs consolidées</div>
          </div>
        )}
        
        {flattenedGlobal.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
            {flattenedGlobal.map((v,i)=>(
              <div 
                key={i} 
                className="px-3 py-2 rounded-lg bg-white border border-green-200 shadow-sm text-center hover:shadow-md transition-shadow"
              >
                <span className="font-mono text-sm font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutilMesureMultiRef;