import React, { useState, useEffect } from 'react';

// Labels prédéfinis pour les mesures spécifiques
const LABELS_PREDEFINIS = [
  "Baie vitrée",
  "Porte",
  "Fenêtre", 
  "Cloison",
  "Mur porteur",
  "Placard",
  "Radiateur",
  "Escalier",
  "Autre"
] as const;

// Types
export interface Mesure {
  id: string;
  raw: number;
  isRef: boolean;
  createdAt: number;
  sectionId: string;  // Lien vers la section parente
  label?: string;     // Label optionnel (ex: "Baie vitrée")
  includeInStats?: boolean; // Inclure dans les statistiques (défaut: true)
}

export interface Section {
  id: string;
  label: string;
  mesures: Mesure[];
  createdAt: number;
}

export interface GroupeMesures {
  id: string;
  label: string;
  sections: Section[];  // Remplace mesures par sections
  refToPrevId?: string | null;  // ID de mesure (across all sections)
  refToNextId?: string | null;  // ID de mesure (across all sections)
  storedRelOffset?: number | null;
}

interface PersistShapeV1 { version: 1; groups: any[] }
interface PersistShapeV2 { version: 2; groups: any[] } // Ancien format avec mesures directes
interface PersistShapeV3 { version: 3; groups: GroupeMesures[] } // Format avec sections mais sans labels
interface PersistShapeV4 { version: 4; groups: GroupeMesures[] } // Format avec sections et labels/stats
type PersistAny = PersistShapeV1 | PersistShapeV2 | PersistShapeV3 | PersistShapeV4;

// Utilitaires
function uuid() { 
  return (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2); 
}

const STORAGE_KEY = 'outil-multi-ref-v4';

export const OutilMesureMultiRef: React.FC = () => {
  // État initial
  const [groups, setGroups] = useState<GroupeMesures[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Essayer de migrer depuis v2
        const oldRaw = localStorage.getItem('outil-multi-ref-v2');
        if (oldRaw) {
          const oldParsed = JSON.parse(oldRaw);
          if (oldParsed?.version === 2) {
            localStorage.removeItem('outil-multi-ref-v2'); // Nettoyer l'ancien
            return migrateFromV2(oldParsed.groups || []);
          }
        }
        return [];
      }
      const parsed: PersistAny = JSON.parse(raw);
      if (!parsed || !('version' in parsed)) return [];
      
      if (parsed.version === 4) {
        return Array.isArray(parsed.groups) ? parsed.groups : [];
      }
      if (parsed.version === 3) {
        return migrateFromV3(parsed.groups || []);
      }
      if (parsed.version === 2) {
        return migrateFromV2(parsed.groups || []);
      }
      if (parsed.version === 1) {
        return migrateFromV1(parsed.groups || []);
      }
      return [];
    } catch { return []; }
  });
  
  // Fonctions de migration
  function migrateFromV1(oldGroups: any[]): GroupeMesures[] {
    return oldGroups.map((g: any, idx: number): GroupeMesures => {
      const ref = Array.isArray(g.mesures) ? g.mesures.find((m: any) => m.isRef) : null;
      const defaultSection: Section = {
        id: uuid(),
        label: 'Général',
        mesures: Array.isArray(g.mesures) ? g.mesures.map((m: any) => ({
          id: m.id || uuid(),
          raw: m.raw ?? 0,
          isRef: !!m.isRef,
          createdAt: m.createdAt || Date.now(),
          sectionId: uuid(), // Sera réassigné après
          label: m.label || undefined,
          includeInStats: m.includeInStats ?? true
        })) : [],
        createdAt: Date.now()
      };
      // Réassigner les sectionId
      defaultSection.mesures.forEach(m => m.sectionId = defaultSection.id);
      
      return {
        id: g.id || uuid(),
        label: g.label || `Position ${idx+1}`,
        sections: [defaultSection],
        refToPrevId: ref ? ref.id : null,
        refToNextId: ref ? ref.id : null,
        storedRelOffset: idx === 0 ? 0 : null
      };
    });
  }
  
  function migrateFromV2(oldGroups: any[]): GroupeMesures[] {
    return oldGroups.map((g: any): GroupeMesures => {
      const defaultSection: Section = {
        id: uuid(),
        label: 'Général',
        mesures: Array.isArray(g.mesures) ? g.mesures.map((m: any) => ({
          id: m.id || uuid(),
          raw: m.raw ?? 0,
          isRef: !!m.isRef,
          createdAt: m.createdAt || Date.now(),
          sectionId: uuid(), // Sera réassigné après
          label: m.label || undefined,
          includeInStats: m.includeInStats ?? true
        })) : [],
        createdAt: Date.now()
      };
      // Réassigner les sectionId
      defaultSection.mesures.forEach(m => m.sectionId = defaultSection.id);
      
      return {
        id: g.id || uuid(),
        label: g.label || 'Position',
        sections: [defaultSection],
        refToPrevId: g.refToPrevId || null,
        refToNextId: g.refToNextId || null,
        storedRelOffset: g.storedRelOffset ?? null
      };
    });
  }
  
  function migrateFromV3(oldGroups: GroupeMesures[]): GroupeMesures[] {
    // Migration de V3 vers V4 : ajouter les nouveaux champs aux mesures existantes
    return oldGroups.map(g => ({
      ...g,
      sections: g.sections.map(s => ({
        ...s,
        mesures: s.mesures.map(m => ({
          ...m,
          label: (m as any).label || undefined,
          includeInStats: (m as any).includeInStats ?? true
        }))
      }))
    }));
  }
  
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(groups[0]?.id || null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(groups[0]?.sections[0]?.id || null);
  const [input, setInput] = useState('');
  const [showRefButtons, setShowRefButtons] = useState<string | null>(null); // ID de la mesure dont on montre les boutons
  const [showDeleteButton, setShowDeleteButton] = useState<string | null>(null); // ID de la position dont on montre le bouton supprimer
  const [showDeleteSection, setShowDeleteSection] = useState<string | null>(null); // ID de la section dont on montre le bouton supprimer
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);
  const [selectedMesureForHighlight, setSelectedMesureForHighlight] = useState<string | null>(null);

  // Fonctions pour le long press
  const handleLongPressStart = (groupId: string, sectionId: string) => {
    setIsLongPressTriggered(false);
    const timer = window.setTimeout(() => {
      setIsLongPressTriggered(true);
      renameSection(groupId, sectionId);
      setLongPressTimer(null);
    }, 800); // 800ms pour déclencher le long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleSectionClick = (groupId: string, sectionId: string) => {
    // Ne pas exécuter le clic si un long press a été déclenché
    if (isLongPressTriggered) {
      setIsLongPressTriggered(false);
      return;
    }
    
    // Si le bouton supprimer est déjà visible pour cette section, sélectionner la section
    if (showDeleteSection === sectionId) {
      setCurrentGroupId(groupId);
      setCurrentSectionId(sectionId);
      setShowDeleteSection(null); // Cacher le bouton supprimer après sélection
    } else {
      // Sinon afficher le bouton supprimer
      setShowDeleteSection(sectionId);
    }
  };

  useEffect(() => {
    const data: PersistShapeV4 = { version: 4, groups };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [groups]);

  const currentGroup = groups.find(g => g.id === currentGroupId) || null;
  const currentSection = currentGroup?.sections.find(s => s.id === currentSectionId) || null;

  // Fonctions de gestion des groupes
  function addGroup() {
    // Vérifier qu'il y a une référence ↓ dans la dernière position (sauf pour la première position)
    if (groups.length > 0) {
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup.refToNextId) {
        alert(`Impossible de créer une nouvelle position !\n\nPour créer une nouvelle position, vous devez d'abord :\n1. Sélectionner une mesure dans la position "${lastGroup.label}"\n2. Cliquer sur la flèche ↓ pour en faire une référence vers le bas\n\nCela permettra d'établir la continuité entre les positions.`);
        return;
      }
    }
    
    const label = prompt('Nom de la position ?', `Position ${groups.length + 1}`);
    if (!label) return;
    const sectionId = crypto.randomUUID();
    const defaultSection: Section = {
      id: sectionId,
      label: 'Section 1',
      mesures: [],
      createdAt: Date.now()
    };
    
    const g: GroupeMesures = { 
      id: uuid(), 
      label, 
      sections: [defaultSection], 
      refToPrevId: null, 
      refToNextId: null, 
      storedRelOffset: groups.length === 0 ? 0 : null 
    };
    setGroups(prev => [...prev, g]);
    setCurrentGroupId(g.id);
    setCurrentSectionId(sectionId);
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
    setCurrentSectionId(null);
  }

  function addSection(groupId: string) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    const label = prompt('Nom de la section ?', `Section ${group.sections.length + 1}`);
    if (!label) return;
    
    const newSection: Section = {
      id: crypto.randomUUID(),
      label,
      mesures: [],
      createdAt: Date.now()
    };
    
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { ...g, sections: [...g.sections, newSection] }
        : g
    ));
    
    setCurrentSectionId(newSection.id);
  }

  function deleteSection(groupId: string, sectionId: string) {
    if (!confirm('Supprimer cette section et ses mesures ?')) return;
    
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { ...g, sections: g.sections.filter(s => s.id !== sectionId) }
        : g
    ));
    
    if (currentSectionId === sectionId) {
      const group = groups.find(g => g.id === groupId);
      const remainingSections = group?.sections.filter(s => s.id !== sectionId) || [];
      setCurrentSectionId(remainingSections[0]?.id || null);
    }
  }

  function renameSection(groupId: string, sectionId: string) {
    const group = groups.find(g => g.id === groupId);
    const section = group?.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newLabel = prompt('Nouveau nom de la section ?', section.label);
    if (!newLabel || newLabel.trim() === '') return;
    
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            sections: g.sections.map(s => 
              s.id === sectionId 
                ? { ...s, label: newLabel.trim() }
                : s
            )
          }
        : g
    ));
  }

  // Fonctions de gestion des labels de mesures
  function setMesureLabel(groupId: string, mesureId: string, label: string | null) {
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            sections: g.sections.map(s => ({
              ...s,
              mesures: s.mesures.map(m => 
                m.id === mesureId 
                  ? { ...m, label: label || undefined }
                  : m
              )
            }))
          }
        : g
    ));
  }

  function toggleMesureInStats(groupId: string, mesureId: string) {
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            sections: g.sections.map(s => ({
              ...s,
              mesures: s.mesures.map(m => {
                if (m.id === mesureId) {
                  // Assurer une valeur explicite - par défaut true si undefined
                  const currentValue = m.includeInStats === undefined ? true : m.includeInStats;
                  const newValue = !currentValue;
                  return { ...m, includeInStats: newValue };
                }
                return m;
              })
            }))
          }
        : g
    ));
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
    const m: Mesure = { 
      id: uuid(), 
      raw: n, 
      isRef: false, 
      createdAt: Date.now(),
      sectionId: currentSectionId!,
      includeInStats: true  // Par défaut, inclure dans les stats
    };
    setGroups(prev => prev.map(g => 
      g.id === currentGroup.id 
        ? { 
            ...g, 
            sections: g.sections.map(s => 
              s.id === currentSectionId 
                ? { ...s, mesures: [...s.mesures, m] }
                : s
            )
          }
        : g
    ));
    setInput('');
  }
  
  function deleteMesure(groupId: string, mesureId: string) {
    if (!confirm('Supprimer cette mesure ?')) return;
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            sections: g.sections.map(s => ({
              ...s,
              mesures: s.mesures.filter(m => m.id !== mesureId)
            }))
          }
        : g
    ));
  }

  // Fonctions utilitaires pour travailler avec les sections
  function findMesureInGroup(group: GroupeMesures, mesureId: string): Mesure | null {
    for (const section of group.sections) {
      const mesure = section.mesures.find(m => m.id === mesureId);
      if (mesure) return mesure;
    }
    return null;
  }

  function getAllMesuresFromGroup(group: GroupeMesures): Mesure[] {
    return group.sections.flatMap(section => section.mesures);
  }

  // Recalcul de la chaîne
  function recalculateChain(updatedGroups: GroupeMesures[]): GroupeMesures[] {
    const result = [...updatedGroups];
    
    for (let i = 1; i < result.length; i++) {
      const prevG = result[i-1];
      const curG = result[i];
      
      const prevRefToNext = prevG.refToNextId ? findMesureInGroup(prevG, prevG.refToNextId) : null;
      const curRefToPrev = curG.refToPrevId ? findMesureInGroup(curG, curG.refToPrevId) : null;
      
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
      const currentGroupIndex = prev.findIndex(g => g.id === groupId);
      
      // Si c'est la première position, on ne peut pas pointer vers le précédent
      if (currentGroupIndex === 0) {
        alert("Impossible de pointer vers le haut depuis la première position.");
        return prev;
      }
      
      const currentGroup = prev[currentGroupIndex];
      const prevGroup = prev[currentGroupIndex - 1];
      
      // Si on active la référence vers le haut
      if (currentGroup.refToPrevId !== mesureId) {
        // Vérifier qu'il y a une mesure qui pointe vers le bas dans la position précédente
        if (!prevGroup.refToNextId) {
          alert("Vous devez d'abord définir une mesure ↓ dans la position précédente.");
          return prev;
        }
      }
      
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
      const currentGroupIndex = prev.findIndex(g => g.id === groupId);
      const currentGroup = prev[currentGroupIndex];
      
      // Si on désactive la référence vers le bas
      if (currentGroup.refToNextId === mesureId) {
        // Vérifier qu'aucune position suivante ne pointe vers cette position
        const nextGroupIndex = currentGroupIndex + 1;
        if (nextGroupIndex < prev.length) {
          const nextGroup = prev[nextGroupIndex];
          if (nextGroup.refToPrevId) {
            alert("Impossible de supprimer cette référence ↓ : la position suivante pointe vers cette position avec ↑.");
            return prev;
          }
        }
      }
      
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
    const r = g.refToPrevId ? findMesureInGroup(g, g.refToPrevId) : null;
    return r ? r.raw : null;
  }

  function refToNextOfGroup(g: GroupeMesures): number | null {
    if (!g.refToNextId) return null;
    const r = g.refToNextId ? findMesureInGroup(g, g.refToNextId) : null;
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

  interface GlobalMesure {
    globalValue: number;
    rawValue: number;
    mesureId: string;
    groupLabel: string;
    sectionLabel: string;
    groupId: string;
    sectionId: string;
    includeInStats: boolean;
    label?: string;
  }

  const flattenedGlobal: GlobalMesure[] = [];
  groups.forEach((g) => {
    const off = globalOffsetOfGroup(g);
    if (off == null) return;
    g.sections.forEach(section => {
      section.mesures.forEach(m => {
        flattenedGlobal.push({
          globalValue: m.raw + off,
          rawValue: m.raw,
          mesureId: m.id,
          groupLabel: g.label,
          sectionLabel: section.label,
          groupId: g.id,
          sectionId: section.id,
          includeInStats: m.includeInStats ?? true,
          label: m.label
        });
      });
    });
  });

  // Pavé numérique
  const padRows = [["7","8","9"],["4","5","6"],["1","2","3"],["0","."]];
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
            className="px-3 py-1 text-sm rounded transition-colors bg-blue-600 text-white hover:bg-blue-700"
            title={(() => {
              if (groups.length === 0) return 'Créer la première position';
              const lastGroup = groups[groups.length - 1];
              return lastGroup.refToNextId 
                ? 'Créer une nouvelle position'
                : 'Cliquez pour plus d\'informations sur la création de positions';
            })()}
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
        <div 
          className="bg-blue-50 rounded-lg p-4"
          style={{
            border: '2px solid #2563eb', // Bordure bleue épaisse
            boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.2)' // Ombre bleue subtile
          }}
        >
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
                      style={{width:'80px',height:'70px',fontSize:'2.5rem'}} 
                      onClick={()=>handlePad(k)}
                    >
                      {k}
                    </button>
                  ))}
                  {i===0 && (
                    <button 
                      className="rounded-lg bg-gray-200 hover:bg-gray-300 font-bold border shadow-sm transition-colors" 
                      style={{width:'80px',height:'70px',fontSize:'2.2rem'}} 
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
                  style={{width:'80px',height:'60px',fontSize:'1.8rem'}} 
                  onClick={()=>handlePad('C')}
                >
                  C
                </button>
                <button 
                  style={{
                    width:'150px',
                    height:'50px',
                    fontSize:'1.1rem',
                    backgroundColor: input.trim() ? '#22c55e' : '#e5e7eb',
                    color: input.trim() ? '#ffffff' : '#9ca3af',
                    border: input.trim() ? '2px solid #16a34a' : '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: input.trim() ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                  }} 
                  disabled={!input.trim()} 
                  onClick={addMesure}
                >
                  Ajouter
                </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((g) => {
            const isCurrent = g.id === currentGroupId;
            
            return (
              <div 
                key={g.id} 
                className={`rounded-xl p-4 transition-all duration-200 ${
                  isCurrent 
                    ? 'bg-blue-50 shadow-lg transform scale-105' 
                    : 'bg-white hover:shadow-md'
                }`}
                style={{
                  border: isCurrent 
                    ? '3px solid #3b82f6' // Bordure bleue épaisse pour la position active
                    : '2px solid #6b7280', // Bordure grise épaisse pour les positions inactives
                  boxShadow: isCurrent 
                    ? '0 0 0 1px rgba(59, 130, 246, 0.3)' 
                    : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              > 
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button 
                      className={`font-bold text-lg truncate ${
                        isCurrent 
                          ? 'text-blue-700' 
                          : 'text-gray-800 hover:text-blue-600'
                      }`} 
                      onClick={() => {
                        // Si le bouton supprimer est déjà visible pour cette position, sélectionner la position
                        if (showDeleteButton === g.id) {
                          setCurrentGroupId(g.id);
                          setShowDeleteButton(null); // Cacher le bouton supprimer après sélection
                        } else {
                          // Sinon afficher le bouton supprimer
                          setShowDeleteButton(g.id);
                        }
                      }}
                      title={g.label}
                    >
                      {g.label}
                    </button>
                    {/* Bouton supprimer - apparaît juste à droite du nom */}
                    {showDeleteButton === g.id && (
                      <button 
                        onClick={() => {
                          deleteGroup(g.id);
                          setShowDeleteButton(null); // Cacher après suppression
                        }} 
                        className="text-red-500 hover:text-red-700 text-sm p-1 hover:bg-red-50 rounded" 
                        title="Supprimer cette position"
                      >
                        ✕
                      </button>
                    )}
                    <button 
                      onClick={()=>addSection(g.id)} 
                      className="text-blue-500 hover:text-blue-700 text-xs p-1 hover:bg-blue-50 rounded font-medium" 
                      title="Ajouter une section"
                    >
                      + Section
                    </button>
                  </div>
                </div>
                

                
                <div className="flex flex-col gap-3">
                  {g.sections.map(section => (
                      <div key={section.id} className="bg-white rounded-lg p-2 w-full" style={{ 
                        border: section.id === currentSectionId && g.id === currentGroupId
                          ? '2px solid #10b981' // Bordure verte épaisse pour la section active
                          : '2px solid #d1d5db', // Bordure grise épaisse pour les sections inactives
                        boxShadow: section.id === currentSectionId && g.id === currentGroupId
                          ? '0 0 0 1px rgba(16, 185, 129, 0.2)'
                          : '0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}>
                        <div 
                          className="flex items-center justify-between text-xs font-semibold px-2 py-1 rounded mb-2"
                          style={{
                            backgroundColor: section.id === currentSectionId && g.id === currentGroupId
                              ? '#dcfce7' // Fond vert clair pour section active
                              : '#f9fafb', // Fond gris clair pour sections inactives
                            color: section.id === currentSectionId && g.id === currentGroupId
                              ? '#166534' // Texte vert foncé pour section active
                              : '#4b5563', // Texte gris pour sections inactives
                            border: section.id === currentSectionId && g.id === currentGroupId
                              ? '1px solid #10b981' // Bordure verte pour section active
                              : '1px solid #d1d5db' // Bordure grise pour sections inactives
                          }}
                        >
                        <button 
                          onClick={() => handleSectionClick(g.id, section.id)}
                          onMouseDown={() => handleLongPressStart(g.id, section.id)}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onTouchStart={() => handleLongPressStart(g.id, section.id)}
                          onTouchEnd={handleLongPressEnd}
                          onTouchCancel={handleLongPressEnd}
                          className="flex-1 text-left hover:text-blue-600"
                          title="Clic: sélectionner | Appui long: renommer la section"
                        >
                          {section.label}
                        </button>
                        {/* Bouton supprimer - apparaît seulement si cette section est sélectionnée */}
                        {showDeleteSection === section.id && (
                          <button 
                            onClick={() => {
                              deleteSection(g.id, section.id);
                              setShowDeleteSection(null); // Cacher après suppression
                            }}
                            className="text-red-400 hover:text-red-600 text-xs ml-2 p-1"
                            title="Supprimer cette section"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      
                      {/* Zone de contrôle fixe - apparaît quand une mesure est sélectionnée */}
                      {showRefButtons && section.mesures.some(m => m.id === showRefButtons) && (
                        <div className="flex items-center justify-center gap-2 py-2 bg-blue-50 rounded border-l-4 border-blue-200 mb-2">
                          <button 
                            onClick={() => {
                              const selectedMesure = section.mesures.find(m => m.id === showRefButtons);
                              if (selectedMesure) {
                                deleteMesure(g.id, selectedMesure.id);
                                setShowRefButtons(null);
                              }
                            }}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            title="Supprimer cette mesure"
                          >
                            Supprimer
                          </button>
                          <button 
                            onClick={() => {
                              const selectedMesure = section.mesures.find(m => m.id === showRefButtons);
                              if (selectedMesure) {
                                toggleMesureInStats(g.id, selectedMesure.id);
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              (() => {
                                const selectedMesure = section.mesures.find(m => m.id === showRefButtons);
                                const isIncluded = selectedMesure ? (selectedMesure.includeInStats === undefined ? true : selectedMesure.includeInStats) : true;
                                return isIncluded
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200';
                              })()
                            }`}
                            title="Basculer inclusion/exclusion des statistiques"
                          >
                            {(() => {
                              const selectedMesure = section.mesures.find(m => m.id === showRefButtons);
                              const isIncluded = selectedMesure ? (selectedMesure.includeInStats === undefined ? true : selectedMesure.includeInStats) : true;
                              return isIncluded ? 'Exclure' : 'Inclure';
                            })()}
                          </button>
                          <button 
                            onClick={() => {
                              const selectedMesure = section.mesures.find(m => m.id === showRefButtons);
                              if (selectedMesure) {
                                toggleRefToPrev(g.id, selectedMesure.id);
                                setShowRefButtons(null); // Cacher les contrôles après action
                              }
                            }} 
                            className={`text-sm px-2 py-1 rounded transition-colors ${
                              (() => {
                                const selectedMesure = section.mesures.find(m => m.id === showRefButtons);
                                const isRefToPrev = selectedMesure && g.refToPrevId === selectedMesure.id;
                                return isRefToPrev 
                                  ? 'text-blue-700 bg-blue-100' 
                                  : 'text-blue-400 hover:text-blue-600 hover:bg-blue-50';
                              })()
                            }`} 
                            title="Référence vers cote du dessus"
                          >
                            ↑
                          </button>
                          <button 
                            onClick={() => {
                              const groupIndex = groups.findIndex(gr => gr.id === g.id);
                              const hasNextGroup = groupIndex < groups.length - 1;
                              
                              if (hasNextGroup) {
                                alert("Impossible de modifier les références ↓ : une position suivante existe déjà.");
                                return;
                              }
                              
                              const selectedMesure = section.mesures.find(m => m.id === showRefButtons);
                              if (selectedMesure) {
                                toggleRefToNext(g.id, selectedMesure.id);
                                setShowRefButtons(null); // Cacher les contrôles après action
                              }
                            }} 
                            disabled={(() => {
                              const groupIndex = groups.findIndex(gr => gr.id === g.id);
                              return groupIndex < groups.length - 1; // Désactivé si pas la dernière position
                            })()} 
                            className={`text-sm px-2 py-1 rounded transition-colors ${
                              (() => {
                                const groupIndex = groups.findIndex(gr => gr.id === g.id);
                                const hasNextGroup = groupIndex < groups.length - 1;
                                const selectedMesure = section.mesures.find(m => m.id === showRefButtons);
                                const isRefToNext = selectedMesure && g.refToNextId === selectedMesure.id;
                                
                                if (hasNextGroup) {
                                  return 'text-gray-400 bg-gray-100 cursor-not-allowed'; // Style désactivé
                                }
                                
                                return isRefToNext 
                                  ? 'text-green-700 bg-green-100' 
                                  : 'text-green-400 hover:text-green-600 hover:bg-green-50';
                              })()
                            }`} 
                            title={(() => {
                              const groupIndex = groups.findIndex(gr => gr.id === g.id);
                              const hasNextGroup = groupIndex < groups.length - 1;
                              return hasNextGroup 
                                ? "Références verrouillées : une position suivante existe"
                                : "Référence vers cote du dessous";
                            })()} 
                          >
                            ↓
                          </button>
                          <button 
                            onClick={() => setShowRefButtons(null)}
                            className="text-xs px-1 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Fermer"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0px', maxHeight: '10rem', overflowY: 'auto', padding: '0px' }}>
                        {section.mesures.length === 0 ? (
                          <div className="w-full text-center text-gray-400 py-3 text-xs italic">
                            Aucune mesure
                          </div>
                        ) : (
                          section.mesures.slice().map(m => {
                          const isRefToPrev = g.refToPrevId === m.id;
                          const isRefToNext = g.refToNextId === m.id;
                          return (
                            <div 
                              key={m.id} 
                              className={`flex flex-col rounded-lg border transition-colors ${
                                (isRefToPrev || isRefToNext)
                                  ? 'bg-amber-50 border-amber-200 shadow-sm'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                              style={{ width: '80px', minWidth: '64px', flexShrink: 0, padding: '0px' }}
                            >
                              <div className="flex flex-col items-center">
                                {/* Bouton valeur avec couleur selon inclusion/exclusion */}
                                <button 
                                  onClick={() => {
                                    // Basculer l'affichage des contrôles pour cette mesure
                                    if (showRefButtons === m.id) {
                                      setShowRefButtons(null); // Cacher les contrôles
                                      setSelectedMesureForHighlight(null); // Désélectionner le surlignage
                                    } else {
                                      setShowRefButtons(m.id); // Afficher les contrôles pour cette mesure
                                      setSelectedMesureForHighlight(m.id); // Sélectionner pour le surlignage
                                    }
                                  }}
                                  className="font-mono text-sm font-semibold px-2 py-1 rounded transition-all duration-200"
                                  style={{
                                    backgroundColor: (() => {
                                      const isIncluded = (m.includeInStats === undefined ? true : m.includeInStats);
                                      const isSelected = showRefButtons === m.id || selectedMesureForHighlight === m.id;
                                      if (isSelected) {
                                        return isIncluded ? '#16a34a' : '#dc2626'; // Vert intense ou rouge intense quand sélectionné
                                      }
                                      return isIncluded ? '#bbf7d0' : '#fecaca'; // Couleurs normales
                                    })(),
                                    color: (() => {
                                      const isSelected = showRefButtons === m.id || selectedMesureForHighlight === m.id;
                                      if (isSelected) {
                                        return '#ffffff'; // Texte blanc quand sélectionné pour contraste
                                      }
                                      const isIncluded = (m.includeInStats === undefined ? true : m.includeInStats);
                                      return isIncluded ? '#166534' : '#dc2626';
                                    })(),
                                    border: (() => {
                                      const isIncluded = (m.includeInStats === undefined ? true : m.includeInStats);
                                      const isSelected = showRefButtons === m.id || selectedMesureForHighlight === m.id;
                                      if (isSelected) {
                                        return `2px solid ${isIncluded ? '#15803d' : '#b91c1c'}`; // Bordure plus épaisse et intense
                                      }
                                      return `1px solid ${isIncluded ? '#86efac' : '#f87171'}`;
                                    })(),
                                    boxShadow: (showRefButtons === m.id || selectedMesureForHighlight === m.id) ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none'
                                  }}
                                  title={`Clic: ${(m.includeInStats === undefined ? true : m.includeInStats) ? 'exclure' : 'inclure'} des statistiques | Appui long: supprimer`}
                                >
                                  <div className="grid grid-cols-3 grid-rows-3 w-full h-full items-center justify-items-center min-w-12 min-h-8">
                                    {/* Flèche haut à gauche */}
                                    <span className="text-xs text-blue-600 leading-none self-start justify-self-start">
                                      {isRefToPrev ? '↑' : ''}
                                    </span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    {/* Valeur au centre */}
                                    <span 
                                      className="font-mono text-sm font-semibold"
                                      style={{
                                        color: (() => {
                                          const isSelected = showRefButtons === m.id || selectedMesureForHighlight === m.id;
                                          if (isSelected) {
                                            return '#ffffff'; // Texte blanc quand sélectionné
                                          }
                                          const isIncluded = (m.includeInStats === undefined ? true : m.includeInStats);
                                          return isIncluded ? '#166534' : '#dc2626';
                                        })()
                                      }}
                                    >
                                      {m.raw}
                                    </span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    {/* Flèche bas à droite */}
                                    <span className="text-xs text-green-600 leading-none self-end justify-self-end">
                                      {isRefToNext ? '↓' : ''}
                                    </span>
                                  </div>
                                </button>
                                {m.label && (
                                  <span className="text-xs text-purple-600 font-medium bg-purple-50 px-1 rounded mt-1">
                                    📌 {m.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section des mesures épinglées */}
      {(() => {
        const mesuresEpinglees = groups.flatMap(g => 
          g.sections.flatMap(s => 
            s.mesures.filter(m => m.label).map(m => ({
              ...m,
              groupLabel: g.label,
              sectionLabel: s.label,
              groupId: g.id
            }))
          )
        );
        
        if (mesuresEpinglees.length === 0) return null;
        
        return (
          <div 
            className="mt-6 p-6 rounded-xl bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 shadow-sm"
            style={{
              border: '3px solid #a855f7', // Bordure violette épaisse
              boxShadow: '0 0 0 1px rgba(168, 85, 247, 0.2)' // Ombre violette
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-purple-800">📌 Mesures épinglées</h3>
              <div className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm">
                {mesuresEpinglees.length} mesure{mesuresEpinglees.length > 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mesuresEpinglees.map(m => {
                const gv = globalValue(m.raw, groups.find(g => g.id === m.groupId)!);
                return (
                  <div key={m.id} className="bg-white p-4 rounded-lg shadow-sm border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-700">{m.label}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        (m.includeInStats ?? true) 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {(m.includeInStats ?? true) ? 'Exclure' : 'Inclure'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 font-mono mb-1">
                      {m.raw}
                    </div>
                    {gv != null && (
                      <div className="text-sm text-blue-600 font-medium">
                        Global: {gv}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {m.groupLabel} → {m.sectionLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Section des valeurs globales améliorée */}
      <div 
        className="mt-6 p-6 rounded-xl bg-gradient-to-br from-green-50 via-blue-50 to-green-50 shadow-sm"
        style={{
          border: '3px solid #059669', // Bordure verte épaisse
          boxShadow: '0 0 0 1px rgba(5, 150, 105, 0.2)' // Ombre verte
        }}
      >
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-green-100">
                  <th className="border border-green-200 px-3 py-2 text-left text-xs font-semibold text-green-800">#</th>
                  <th className="border border-green-200 px-3 py-2 text-left text-xs font-semibold text-green-800">Position</th>
                  <th className="border border-green-200 px-3 py-2 text-left text-xs font-semibold text-green-800">Section</th>
                  <th className="border border-green-200 px-3 py-2 text-left text-xs font-semibold text-green-800">Mesure brute</th>
                  <th className="border border-green-200 px-3 py-2 text-left text-xs font-semibold text-green-800">Valeur globale</th>
                  <th className="border border-green-200 px-3 py-2 text-left text-xs font-semibold text-green-800">Label</th>
                  <th className="border border-green-200 px-3 py-2 text-center text-xs font-semibold text-green-800">Statut</th>
                </tr>
              </thead>
              <tbody>
                {flattenedGlobal.map((mesure, i) => {
                  const isHighlighted = selectedMesureForHighlight === mesure.mesureId;
                  return (
                    <tr 
                      key={i} 
                      className="transition-colors"
                      style={{
                        backgroundColor: isHighlighted ? '#fef9e7' : 'transparent', // Jaune très clair pour surlignage
                        boxShadow: isHighlighted ? '0 0 0 2px #3b82f6' : 'none', // Bordure bleue pour surlignage
                        outline: isHighlighted ? '1px solid #2563eb' : 'none' // Contour bleu plus discret
                      }}
                      onMouseEnter={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.backgroundColor = '#f0fdf4'; // Vert clair au survol
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <td 
                        className="border border-green-200 px-3 py-2 text-xs"
                        style={{ color: isHighlighted ? '#374151' : '#6b7280' }}
                      >
                        {i + 1}
                      </td>
                      <td 
                        className="border border-green-200 px-3 py-2 text-xs font-medium"
                        style={{ color: isHighlighted ? '#111827' : '#374151' }}
                      >
                        {mesure.groupLabel}
                      </td>
                      <td 
                        className="border border-green-200 px-3 py-2 text-xs"
                        style={{ color: isHighlighted ? '#374151' : '#6b7280' }}
                      >
                        {mesure.sectionLabel}
                      </td>
                      <td 
                        className="border border-green-200 px-3 py-2 text-sm font-mono font-semibold"
                        style={{ color: isHighlighted ? '#111827' : '#1f2937' }}
                      >
                        {mesure.rawValue}
                      </td>
                      <td 
                        className="border border-green-200 px-3 py-2 text-sm font-mono font-bold"
                        style={{
                          color: isHighlighted ? '#1e40af' : '#047857', // Bleu foncé si surligné, vert foncé sinon
                          fontWeight: isHighlighted ? '800' : '700', // Légèrement plus gras si surligné
                          backgroundColor: isHighlighted ? '#dbeafe' : 'transparent' // Fond bleu très clair si surligné
                        }}
                      >
                        {mesure.globalValue}
                      </td>
                      <td className="border border-green-200 px-3 py-2 text-xs">
                        {mesure.label && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                            📌 {mesure.label}
                          </span>
                        )}
                      </td>
                      <td className="border border-green-200 px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          mesure.includeInStats 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {mesure.includeInStats ? '✓' : '✗'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutilMesureMultiRef;