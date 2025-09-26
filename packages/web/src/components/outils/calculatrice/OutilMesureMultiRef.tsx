import React, { useState, useEffect } from 'react';
import { saveMesures, loadMesures, type Projet, type GroupeMesures as APIGroupeMesures, type Section as APISection, type Mesure as APIMesure } from '../../../api/users';

// Labels prédéfinis pour les mesures spécifiques
const LABELS_PREDEFINIS = [
  "Porte",
  "Baie vitree",
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

interface OutilMesureMultiRefProps {
  selectedProject: Projet | null;
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

export const OutilMesureMultiRef: React.FC<OutilMesureMultiRefProps> = ({ selectedProject }) => {
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
  const [statisticsReferenceId, setStatisticsReferenceId] = useState<string | null>(null);
  const [candidateReferenceId, setCandidateReferenceId] = useState<string | null>(null); // Mesure candidate pour devenir référence
  const [pendingLabels, setPendingLabels] = useState<Record<string, string>>({}); // Stocke les labels en cours de modification

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

  // Sauvegarde automatique en base de données
  useEffect(() => {
    if (selectedProject && groups.length > 0) {
      const saveTimeout = setTimeout(async () => {
        try {
          await saveMesures(selectedProject.id, groups);
          console.log('✅ Mesures sauvegardées automatiquement');
        } catch (error) {
          console.error('❌ Erreur sauvegarde automatique:', error);
        }
      }, 1000); // Débounce de 1 seconde

      return () => clearTimeout(saveTimeout);
    }
  }, [groups, selectedProject]);

  // Chargement des données depuis la base
  useEffect(() => {
    if (selectedProject) {
      loadMesures(selectedProject.id)
        .then(loadedGroups => {
          if (loadedGroups.length > 0) {
            setGroups(loadedGroups);
            // Sélectionner la première position et section par défaut
            if (loadedGroups[0]) {
              setCurrentGroupId(loadedGroups[0].id);
              if (loadedGroups[0].sections[0]) {
                setCurrentSectionId(loadedGroups[0].sections[0].id);
              }
            }
            console.log('✅ Mesures chargées depuis la base:', loadedGroups.length, 'positions');
          } else {
            // Nouveau projet vide
            setGroups([]);
            setCurrentGroupId(null);
            setCurrentSectionId(null);
          }
        })
        .catch(error => {
          console.error('❌ Erreur chargement mesures:', error);
          // Fallback sur localStorage en cas d'erreur
          const data: PersistShapeV4 = { version: 4, groups: [] };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        });
    } else {
      // Pas de projet sélectionné, utiliser localStorage comme avant
      const data: PersistShapeV4 = { version: 4, groups };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [selectedProject]);

  const currentGroup = groups.find(g => g.id === currentGroupId) || null;
  const currentSection = currentGroup?.sections.find(s => s.id === currentSectionId) || null;

  // Fonctions de gestion des groupes
  function addGroup() {
    console.log('🔵 addGroup called, groups.length:', groups.length);
    
    // Vérifier qu'il y a une référence ↓ dans la dernière position (sauf pour la première position)
    if (groups.length > 0) {
      const lastGroup = groups[groups.length - 1];
      console.log('🔵 lastGroup.refToNextId:', lastGroup.refToNextId);
      if (!lastGroup.refToNextId) {
        console.log('🔴 Blocked: no refToNextId in last group');
        alert(`Impossible de créer une nouvelle position !\n\nPour créer une nouvelle position, vous devez d'abord :\n1. Sélectionner une mesure dans la position "${lastGroup.label}"\n2. Cliquer sur la flèche ↓ pour en faire une référence vers le bas\n\nCela permettra d'établir la continuité entre les positions.`);
        return;
      }
    }
    
    const label = prompt('Nom de la position ?', `Position ${groups.length + 1}`);
    console.log('🔵 prompt result:', label);
    if (!label) {
      console.log('🔴 Canceled: no label provided');
      return;
    }
    
    let sectionId;
    try {
      sectionId = crypto.randomUUID();
      console.log('🔵 sectionId generated:', sectionId);
    } catch (e) {
      console.error('🔴 Error generating sectionId:', e);
      sectionId = Math.random().toString(36).slice(2);
      console.log('🔵 fallback sectionId:', sectionId);
    }
    
    const defaultSection: Section = {
      id: sectionId,
      label: 'Section 1',
      mesures: [],
      createdAt: Date.now()
    };
    
    const groupId = uuid();
    console.log('🔵 groupId generated:', groupId);
    
    const g: GroupeMesures = { 
      id: groupId, 
      label, 
      sections: [defaultSection], 
      refToPrevId: null, 
      refToNextId: null, 
      storedRelOffset: groups.length === 0 ? 0 : null 
    };
    
    console.log('🔵 New group object:', g);
    setGroups(prev => {
      const newGroups = [...prev, g];
      console.log('🔵 New groups array length:', newGroups.length);
      return newGroups;
    });
    setCurrentGroupId(g.id);
    setCurrentSectionId(sectionId);
    console.log('🔵 addGroup completed');
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
    if (!currentGroup) {
      alert("Aucune position sélectionnée !\n\nVeuillez d'abord sélectionner une position pour y ajouter des mesures.");
      return;
    }
    
    if (!currentSectionId) {
      alert("Aucune section sélectionnée !\n\nVeuillez d'abord sélectionner une section pour y ajouter des mesures.");
      return;
    }
    
    // Vérifier que la section courante appartient bien à la position courante
    const currentSectionBelongsToCurrentGroup = currentGroup.sections.some(s => s.id === currentSectionId);
    if (!currentSectionBelongsToCurrentGroup) {
      alert(`Impossible d'ajouter une mesure !\n\nLa section sélectionnée n'appartient pas à la position courante "${currentGroup.label}".\n\nVeuillez d'abord sélectionner une section de la position courante.`);
      return;
    }
    
    // Vérifier que la position courante est bien la dernière position (la plus récente)
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || currentGroup.id !== lastGroup.id) {
      const currentIndex = groups.findIndex(g => g.id === currentGroup.id) + 1;
      const lastIndex = groups.length;
      alert(`Impossible d'ajouter une mesure !\n\nVous ne pouvez ajouter des mesures qu'à la dernière position créée.\n\nPosition courante : "${currentGroup.label}" (position ${currentIndex})\nDernière position : "${lastGroup.label}" (position ${lastIndex})\n\nSupprimez d'abord les positions suivantes ou sélectionnez la dernière position.`);
      return;
    }
    
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
        // La première position a toujours un offset de 0 (référence absolue)
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
  const padRows = [["7","8","9"],["4","5","6"],["1","2","3"],["0",".","C"]];
  function handlePad(key: string){
    if(key==='⌫'){ setInput(s=>s.slice(0,-1)); return; }
    if(key==='C'){ setInput(''); return; }
    setInput(s=>s+key);
  }

  // Affichage si aucun projet sélectionné
  if (!selectedProject) {
    return (
      <div className="p-4 rounded-xl border bg-white shadow max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h2 className="text-xl font-bold mb-2">Aucun projet sélectionné</h2>
          <p className="text-gray-600">
            Sélectionnez ou créez un projet pour commencer à prendre des mesures.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border bg-white shadow max-w-7xl mx-auto flex flex-col gap-4">
      {/* En-tête avec nom du projet */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Mesures multi-références</h2>
          <div className="text-sm text-gray-600">
            📁 {selectedProject.nom}
            {selectedProject.description && (
              <span className="ml-2 text-gray-500">• {selectedProject.description}</span>
            )}
          </div>
        </div>
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
            Supprimer
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
              className="border rounded-lg px-6 py-4 text-right font-mono text-2xl bg-white flex-1" 
              style={{ minWidth: '320px', maxWidth: '480px' }}
              value={input} 
              placeholder="Nouvelle mesure" 
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
            {/* Pavé numérique centré */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {padRows.map((row,i)=>(
                <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {row.map(k=> (
                    <button 
                      key={k} 
                      style={{
                        width: '180',
                        height: '180px',
                        fontSize: '3.5rem',
                        borderRadius: '16px',
                        backgroundColor: k === 'C' ? '#e5e7eb' : '#ffffff',
                        border: k === 'C' ? '3px solid #9ca3af' : '3px solid #60a5fa',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        color: '#1f2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = k === 'C' ? '#d1d5db' : '#dbeafe'}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = k === 'C' ? '#e5e7eb' : '#ffffff'}
                      onClick={()=>handlePad(k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              ))}
              
              {/* Bouton Ajouter centré en bas */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button 
                  style={{
                    width:'200px',
                    height:'70px',
                    fontSize:'1.4rem',
                    backgroundColor: input.trim() ? '#22c55e' : '#e5e7eb',
                    color: input.trim() ? '#ffffff' : '#9ca3af',
                    border: input.trim() ? '3px solid #16a34a' : '3px solid #d1d5db',
                    borderRadius: '12px',
                    fontWeight: '700',
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
                  {g.sections.map((section, sectionIndex) => (
                      <div 
                        key={section.id} 
                        className="rounded-lg w-full" 
                        style={{ 
                          backgroundColor: section.id === currentSectionId && g.id === currentGroupId
                            ? '#f0fdf4' // Fond vert très clair pour section active
                            : '#ffffff', // Fond blanc pour sections inactives
                          border: section.id === currentSectionId && g.id === currentGroupId
                            ? '3px solid #22c55e' // Bordure verte épaisse pour la section active
                            : '2px solid #e5e7eb', // Bordure grise pour les sections inactives
                          boxShadow: section.id === currentSectionId && g.id === currentGroupId
                            ? '0 4px 12px rgba(34, 197, 94, 0.15)' // Ombre verte pour section active
                            : '0 2px 4px rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        {/* En-tête de section avec design amélioré */}
                        <div 
                          className="flex items-center justify-between text-sm font-bold px-3 py-2 mb-2" 
                          style={{
                            backgroundColor: section.id === currentSectionId && g.id === currentGroupId
                              ? '#22c55e' // Fond vert vif pour section active
                              : '#6b7280', // Fond gris pour sections inactives
                            color: '#ffffff', // Texte blanc pour tous
                            borderRadius: section.id === currentSectionId && g.id === currentGroupId
                              ? '6px 6px 0 0' // Coins arrondis haut pour section active
                              : '4px 4px 0 0' // Coins arrondis plus subtils pour sections inactives
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {/* Icône de section */}
                            <span className="text-lg">
                              {section.id === currentSectionId && g.id === currentGroupId ? '📂' : '📁'}
                            </span>
                            <button 
                              onClick={() => handleSectionClick(g.id, section.id)}
                              onMouseDown={() => handleLongPressStart(g.id, section.id)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onTouchStart={() => handleLongPressStart(g.id, section.id)}
                              onTouchEnd={handleLongPressEnd}
                              onTouchCancel={handleLongPressEnd}
                              className="flex-1 text-left hover:underline font-medium text-white"
                              title="Clic: sélectionner | Appui long: renommer la section"
                            >
                              {section.label === `Section ${sectionIndex + 1}` ? 'Section' : section.label}
                            </button>
                          </div>
                          {/* Bouton supprimer - apparaît seulement si cette section est sélectionnée */}
                          {showDeleteSection === section.id && (
                            <button 
                              onClick={() => {
                                deleteSection(g.id, section.id);
                                setShowDeleteSection(null); // Cacher après suppression
                              }}
                              className="text-red-200 hover:text-white text-xs ml-2 p-1 hover:bg-red-500 rounded"
                              title="Supprimer cette section"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        
                        {/* Contenu de la section avec padding */}
                        <div className="p-3">

                      
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
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}



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
                  <th className="border border-green-200 px-3 py-2 text-left text-xs font-semibold text-green-800">Label (éditable)</th>
                  <th className="border border-green-200 px-3 py-2 text-center text-xs font-semibold text-green-800">Statut</th>
                  <th className="border border-green-200 px-3 py-2 text-center text-xs font-semibold text-green-800">Référence</th>
                </tr>
              </thead>
              <tbody>
                {flattenedGlobal.map((mesure, i) => {
                  const isHighlighted = selectedMesureForHighlight === mesure.mesureId;
                  const isReference = statisticsReferenceId === mesure.mesureId;
                  return (
                    <tr 
                      key={i} 
                      className="transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isReference
                          ? '#f3e8ff' // Fond violet clair pour la référence
                          : isHighlighted 
                            ? '#fef9e7' // Jaune très clair pour surlignage
                            : 'transparent',
                        boxShadow: isReference
                          ? '0 0 0 3px #8b5cf6' // Bordure violette épaisse pour la référence
                          : isHighlighted 
                            ? '0 0 0 2px #3b82f6' // Bordure bleue pour surlignage
                            : 'none',
                        outline: isReference
                          ? '2px solid #7c3aed' // Contour violet pour la référence
                          : isHighlighted 
                            ? '1px solid #2563eb' // Contour bleu plus discret
                            : 'none'
                      }}
                      onClick={() => {
                        // Clic normal pour illuminer le bouton de mesure correspondant
                        setSelectedMesureForHighlight(mesure.mesureId);
                        setShowRefButtons(mesure.mesureId);
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
                      title="Clic: illuminer la mesure correspondante"
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
                      <td 
                        className="border border-green-200 px-2 py-2 text-xs" 
                        onClick={(e) => e.stopPropagation()} // Empêcher le clic de remonter
                      >
                        {(() => {
                          const pendingValue = pendingLabels[mesure.mesureId];
                          const hasPendingChanges = pendingValue !== undefined;
                          const hasExistingLabel = mesure.label && mesure.label.trim() !== '';
                          const currentValue = hasPendingChanges ? pendingValue : (mesure.label || '');
                          
                          return (
                            <div className="flex flex-col gap-2">
                              {/* Ligne combinée : saisie + bouton approprié */}
                              <div className="flex gap-1">
                                {/* Champ de saisie manuelle */}
                                <input
                                  type="text"
                                  id={`label-input-${mesure.mesureId}`}
                                  name={`label-${mesure.mesureId}`}
                                  value={currentValue}
                                  onChange={(e) => {
                                    const newLabel = e.target.value;
                                    // Marquer comme modification en cours
                                    setPendingLabels(prev => ({
                                      ...prev,
                                      [mesure.mesureId]: newLabel
                                    }));
                                  }}
                                  placeholder="Label..."
                                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-l focus:border-purple-500 focus:outline-none"
                                  style={{ minWidth: '80px' }}
                                />
                                
                                {/* Bouton approprié selon l'état */}
                                {hasPendingChanges ? (
                                  // Bouton de validation vert (plus petit)
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Valider les modifications
                                      const finalLabel = (pendingLabels[mesure.mesureId] || '').trim();
                                      setMesureLabel(mesure.groupId, mesure.mesureId, finalLabel || null);
                                      // Supprimer de la liste des modifications en cours
                                      setPendingLabels(prev => {
                                        const updated = { ...prev };
                                        delete updated[mesure.mesureId];
                                        return updated;
                                      });
                                    }}
                                    className="px-1 py-1 text-xs bg-green-500 text-white rounded-r hover:bg-green-600 transition-colors"
                                    style={{ width: '24px', fontSize: '10px' }}
                                    title="Valider le label"
                                  >
                                    ✓
                                  </button>
                                ) : hasExistingLabel ? (
                                  // Bouton croix pour supprimer le label existant
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMesureLabel(mesure.groupId, mesure.mesureId, null);
                                    }}
                                    className="px-1 py-1 text-xs bg-red-500 text-white rounded-r hover:bg-red-600 transition-colors"
                                    style={{ width: '24px', fontSize: '10px' }}
                                    title="Supprimer le label"
                                  >
                                    ✕
                                  </button>
                                ) : (
                                  // Menu déroulant compact (seulement si pas de label)
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      const selectedValue = e.target.value;
                                      if (selectedValue) {
                                        // Marquer comme modification en cours même pour les prédéfinis
                                        setPendingLabels(prev => ({
                                          ...prev,
                                          [mesure.mesureId]: selectedValue
                                        }));
                                      }
                                    }}
                                    className="px-1 py-1 text-xs border border-gray-300 rounded-r focus:border-purple-500 focus:outline-none bg-white"
                                    style={{ width: '24px', textAlign: 'center', fontSize: '10px' }}
                                    title="Choisir un label prédéfini"
                                  >
                                    <option value="">📋</option>
                                    {LABELS_PREDEFINIS.map((label) => (
                                      <option key={label} value={label}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="border border-green-200 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMesureInStats(mesure.groupId, mesure.mesureId);
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${
                              mesure.includeInStats 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                            title={mesure.includeInStats 
                              ? 'Cliquer pour exclure des statistiques' 
                              : 'Cliquer pour inclure dans les statistiques'
                            }
                          >
                            {mesure.includeInStats ? '✓' : '✗'}
                          </button>
                        </div>
                      </td>
                      <td className="border border-green-200 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Case à cocher pour candidater comme référence */}
                          <input
                            type="checkbox"
                            checked={candidateReferenceId === mesure.mesureId}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setCandidateReferenceId(mesure.mesureId);
                              } else {
                                setCandidateReferenceId(null);
                              }
                            }}
                            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                            title="Sélectionner comme référence"
                          />
                          
                          {/* Bouton de validation (apparaît seulement si cette mesure est candidate) */}
                          {candidateReferenceId === mesure.mesureId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Valider la référence (écrase l'ancienne)
                                setStatisticsReferenceId(candidateReferenceId);
                                setCandidateReferenceId(null); // Réinitialiser le candidat
                              }}
                              className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                              title="Confirmer comme référence"
                            >
                              ✓
                            </button>
                          )}
                          
                          {/* Indicateur de référence active */}
                          {statisticsReferenceId === mesure.mesureId && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                              REF
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section des statistiques */}
      {(() => {
        // Filtrer les mesures incluses dans les statistiques
        const statsData = flattenedGlobal.filter(m => m.includeInStats);
        
        if (statsData.length === 0) return null;

        // Calculer les statistiques
        const globalValues = statsData.map(m => m.globalValue);
        const moyenne = globalValues.reduce((sum, val) => sum + val, 0) / globalValues.length;
        const min = Math.min(...globalValues);
        const max = Math.max(...globalValues);
        const etendue = max - min;
        
        // Calculer le mode (valeur la plus fréquente)
        const frequency = globalValues.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        const maxFreq = Math.max(...Object.values(frequency));
        const modes = Object.keys(frequency).filter(key => frequency[Number(key)] === maxFreq).map(Number);
        
        // Référence statistique - peut provenir de TOUTES les mesures, pas seulement celles incluses dans les stats
        const referenceValue = statisticsReferenceId 
          ? flattenedGlobal.find(m => m.mesureId === statisticsReferenceId)?.globalValue ?? null
          : null;

        // Recalculer avec référence si définie
        // Formule: valeur_finale = v_globale - v_ref (la référence devient le point zéro)
        const refValue = referenceValue ?? 0; // Valeur de sécurité
        const adjustedValues = referenceValue !== null 
          ? globalValues.map(val => val - refValue)
          : globalValues;
        
        const adjustedMoyenne = referenceValue !== null 
          ? moyenne - refValue 
          : moyenne;
        const adjustedMin = referenceValue !== null 
          ? min - refValue 
          : min;
        const adjustedMax = referenceValue !== null 
          ? max - refValue 
          : max;

        return (
          <div 
            className="mt-6 p-6 rounded-xl bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 shadow-sm"
            style={{
              border: '3px solid #7c3aed', // Bordure violette épaisse
              boxShadow: '0 0 0 1px rgba(124, 58, 237, 0.2)' // Ombre violette
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-purple-800">📊 Statistiques des valeurs globales</h3>
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm">
                  {statsData.length} valeurs incluses
                </div>
                


                {referenceValue !== null && (() => {
                  // Trouver les détails de la mesure de référence parmi TOUTES les mesures
                  const refMesureDetails = flattenedGlobal.find(m => m.mesureId === statisticsReferenceId);
                  const refMesureIndex = flattenedGlobal.findIndex(m => m.mesureId === statisticsReferenceId) + 1;
                  
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-purple-700">Référence:</span>
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                        <span className="font-mono font-bold">#{refMesureIndex}</span>
                        <span className="text-purple-600">|</span>
                        <span className="font-mono">{referenceValue}</span>
                        {refMesureDetails && (
                          <>
                            <span className="text-purple-600">|</span>
                            <span className="font-medium">{refMesureDetails.groupLabel}</span>
                            <span className="text-purple-600">→</span>
                            <span className="font-medium">{refMesureDetails.sectionLabel}</span>
                            {refMesureDetails.label && (
                              <>
                                <span className="text-purple-600">|</span>
                                <span className="text-purple-700">📌{refMesureDetails.label}</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      <button 
                        onClick={() => setStatisticsReferenceId(null)}
                        className="text-purple-600 hover:text-purple-800 text-xs hover:bg-purple-50 rounded px-1"
                        title={`Supprimer la référence #${refMesureIndex} (${referenceValue})`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-purple-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-100 via-indigo-100 to-purple-100">
                    <th className="px-8 py-4 text-left text-sm font-bold text-purple-800 border-b border-purple-200">
                      📊 Statistique
                    </th>
                    <th className="px-8 py-4 text-center text-sm font-bold text-purple-800 border-b border-purple-200">
                      Valeur
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Moyenne */}
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-8 py-6 border-b border-gray-100">
                      <span className="font-semibold text-purple-700 text-lg">Moyenne</span>
                    </td>
                    <td className="px-8 py-6 border-b border-gray-100 text-center">
                      <span className="text-3xl font-bold text-purple-800 font-mono">
                        {adjustedMoyenne.toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {/* Minimum */}
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-8 py-6 border-b border-gray-100">
                      <span className="font-semibold text-blue-700 text-lg">Minimum</span>
                    </td>
                    <td className="px-8 py-6 border-b border-gray-100 text-center">
                      <span className="text-3xl font-bold text-blue-800 font-mono">
                        {adjustedMin.toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {/* Maximum */}
                  <tr className="hover:bg-red-50 transition-colors">
                    <td className="px-8 py-6 border-b border-gray-100">
                      <span className="font-semibold text-red-700 text-lg">Maximum</span>
                    </td>
                    <td className="px-8 py-6 border-b border-gray-100 text-center">
                      <span className="text-3xl font-bold text-red-800 font-mono">
                        {adjustedMax.toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {/* Étendue */}
                  <tr className="hover:bg-green-50 transition-colors">
                    <td className="px-8 py-6 border-b border-gray-100">
                      <span className="font-semibold text-green-700 text-lg">Étendue</span>
                    </td>
                    <td className="px-8 py-6 border-b border-gray-100 text-center">
                      <span className="text-3xl font-bold text-green-800 font-mono">
                        {etendue.toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {/* Mode */}
                  <tr className="hover:bg-orange-50 transition-colors">
                    <td className="px-8 py-6">
                      <span className="font-semibold text-orange-700 text-lg">Mode</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-3xl font-bold text-orange-800 font-mono">
                        {modes.length === globalValues.length 
                          ? "—"
                          : modes.map(mode => 
                              referenceValue !== null 
                                ? (mode - refValue).toFixed(2)
                                : mode.toFixed(2)
                            ).join(", ")
                        }
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {statsData.length < flattenedGlobal.length && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-xs text-yellow-800">
                  ⚠️ {flattenedGlobal.length - statsData.length} mesure(s) exclue(s) des calculs statistiques
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500">
              💡 <strong>Astuce:</strong> Cochez la case "Référence" d'une mesure puis cliquez sur ✓ pour la définir comme point de référence statistique
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default OutilMesureMultiRef;