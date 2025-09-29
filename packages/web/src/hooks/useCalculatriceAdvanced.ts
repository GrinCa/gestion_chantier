/**
 * useCalculatriceAdvanced – Hook unifié pour l'UI calculatrice "legacy" enrichie
 * ============================================================================
 * Objectif: remplacer progressivement la logique embarquée dans OutilMesureMultiRef
 * en réutilisant exclusivement l'API métier du core (calculatriceTool) + quelques
 * règles UX spécifiques (ajout seulement sur dernière position, contrainte ref ↓ avant nouvelle position, etc.).
 *
 * Ce hook ne contient QUE la logique de données / état durable UI. Tout ce qui est purement
 * éphémère (afficher un menu, état de survol, animations) reste dans le composant.
 */

import { useState, useCallback, useMemo } from 'react';
import { calculatriceTool, type GroupeMesures, type Mesure } from '@gestion-chantier/core';

export interface UseCalculatriceAdvancedOptions {
  /** ID projet / workspace (optionnel si persistance backend souhaitée plus tard) */
  projectId?: string;
  /** Activer future auto-save (non implémenté ici – extension) */
  autoSave?: boolean;
}

export interface FlattenedMesureRow {
  groupId: string;
  sectionId: string;
  mesureId: string;
  groupLabel: string;
  sectionLabel: string;
  raw: number;
  globalValue: number | null;
  includeInStats: boolean;
  label?: string;
}

export interface GlobalStats {
  count: number;
  min: number;
  max: number;
  moyenne: number;
  ref: number | null;            // Valeur globale de référence (si définie)
  adjusted?: {                   // Valeurs ajustées si ref définie
    min: number;
    max: number;
    moyenne: number;
  } | null;
}

export function useCalculatriceAdvanced(opts: UseCalculatriceAdvancedOptions = {}) {
  // ===== STATE PRINCIPAL =====
  const [groups, setGroups] = useState<GroupeMesures[]>(() => calculatriceTool.getDefaultData());
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(() => groups[0]?.id || null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(() => groups[0]?.sections[0]?.id || null);
  const [statsReferenceMesureId, setStatsReferenceMesureId] = useState<string | null>(null); // Référence globale pour stats
  const [lastError, setLastError] = useState<string | null>(null);

  // ===== DERIVÉS =====
  const currentGroup = useMemo(
    () => groups.find(g => g.id === currentGroupId) || null,
    [groups, currentGroupId]
  );
  const currentSection = useMemo(
    () => currentGroup?.sections.find(s => s.id === currentSectionId) || null,
    [currentGroup, currentSectionId]
  );

  // Chaîne valide = tous offsets définis (sauf premier)
  const hasValidChain = useMemo(
    () => groups.every((g, i) => i === 0 || g.storedRelOffset !== null),
    [groups]
  );

  // ===== HELPERS =====
  const updateGroups = useCallback((g: GroupeMesures[]) => {
    setGroups(g);
    setLastError(null);
  }, []);

  const findMesure = useCallback((groupId: string, mesureId: string): Mesure | null => {
    const group = groups.find(g => g.id === groupId);
    return group ? calculatriceTool.findMesureInGroup(group, mesureId) : null;
  }, [groups]);

  // ===== RÈGLES UX SPÉCIFIQUES =====
  const canAddGroupe = useCallback((): { ok: boolean; reason?: string } => {
    if (groups.length === 0) return { ok: true };
    const last = groups[groups.length - 1];
    if (!last.refToNextId) {
      return { ok: false, reason: 'Définir d\'abord une référence ↓ dans la dernière position.' };
    }
    return { ok: true };
  }, [groups]);

  const isLastGroup = useCallback((groupId: string) => {
    return groups[groups.length - 1]?.id === groupId;
  }, [groups]);

  // ===== OPERATIONS GROUPES =====
  const addGroupe = useCallback((label?: string) => {
    const check = canAddGroupe();
    if (!check.ok) {
      setLastError(check.reason || 'Impossible d\'ajouter une position');
      return { error: check.reason };
    }
    const updated = calculatriceTool.addGroupe(groups, label || `Position ${groups.length + 1}`);
    updateGroups(updated);
    const newG = updated[updated.length - 1];
    setCurrentGroupId(newG.id);
    setCurrentSectionId(newG.sections[0].id);
    return { ok: true };
  }, [groups, canAddGroupe, updateGroups]);

  const removeGroupe = useCallback((groupId: string) => {
    if (groups.length <= 1) {
      setLastError('Impossible de supprimer la dernière position');
      return;
    }
    const updated = calculatriceTool.removeGroupe(groups, groupId);
    updateGroups(updated);
    if (currentGroupId === groupId) {
      const g = updated[updated.length - 1];
      setCurrentGroupId(g?.id || null);
      setCurrentSectionId(g?.sections[0]?.id || null);
    }
  }, [groups, currentGroupId, updateGroups]);

  const addSection = useCallback((groupId: string, label?: string) => {
    const updated = calculatriceTool.addSection(groups, groupId, label || `Section ${(groups.find(g => g.id === groupId)?.sections.length || 0) + 1}`);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const renameSection = useCallback((groupId: string, sectionId: string, newLabel: string) => {
    const updated = calculatriceTool.updateSection(groups, groupId, sectionId, { label: newLabel });
    updateGroups(updated);
  }, [groups, updateGroups]);

  const removeSection = useCallback((groupId: string, sectionId: string) => {
    // Politique: ne pas supprimer la dernière section d'un groupe
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    if (group.sections.length <= 1) {
      setLastError('Impossible de supprimer la dernière section');
      return;
    }
    const updated = calculatriceTool.removeSection(groups, groupId, sectionId);
    updateGroups(updated);
    if (currentSectionId === sectionId) {
      const newG = updated.find(g => g.id === groupId);
      setCurrentSectionId(newG?.sections[0]?.id || null);
    }
  }, [groups, currentSectionId, updateGroups]);

  // ===== OPERATIONS MESURES =====
  const addMesure = useCallback((raw: number) => {
    if (!currentGroup || !currentSection) {
      const msg = 'Aucune position ou section active';
      setLastError(msg);
      return { error: msg };
    }
    if (!isLastGroup(currentGroup.id)) {
      const msg = 'Ajout uniquement sur la dernière position';
      setLastError(msg);
      return { error: msg };
    }
    const updated = calculatriceTool.addMesure(groups, currentGroup.id, currentSection.id, raw);
    updateGroups(updated);
    return { ok: true };
  }, [groups, currentGroup, currentSection, isLastGroup, updateGroups]);

  const removeMesure = useCallback((groupId: string, mesureId: string) => {
    const updated = calculatriceTool.removeMesure(groups, groupId, mesureId);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const setMesureLabel = useCallback((groupId: string, mesureId: string, label: string | null) => {
    const updated = calculatriceTool.updateMesure(groups, groupId, mesureId, { label: label || undefined });
    updateGroups(updated);
  }, [groups, updateGroups]);

  const toggleIncludeInStats = useCallback((groupId: string, mesureId: string) => {
    const m = findMesure(groupId, mesureId);
    if (!m) return;
    const include = m.includeInStats === undefined ? true : m.includeInStats;
    const updated = calculatriceTool.updateMesure(groups, groupId, mesureId, { includeInStats: !include });
    updateGroups(updated);
  }, [groups, findMesure, updateGroups]);

  // ===== REFERENCES =====
  const toggleRefToPrev = useCallback((groupId: string, mesureId: string) => {
    const result = calculatriceTool.toggleRefToPrev(groups, groupId, mesureId);
    if (result.error) setLastError(result.error);
    else updateGroups(result.groups);
  }, [groups, updateGroups]);

  const toggleRefToNext = useCallback((groupId: string, mesureId: string) => {
    // Politique: seulement si le groupe est le dernier (sinon verrou)
    const idx = groups.findIndex(g => g.id === groupId);
    if (idx !== groups.length - 1) {
      setLastError('Références ↓ verrouillées (il existe une position suivante)');
      return;
    }
    const result = calculatriceTool.toggleRefToNext(groups, groupId, mesureId);
    if (result.error) setLastError(result.error);
    else updateGroups(result.groups);
  }, [groups, updateGroups]);

  // ===== FLATTEN + GLOBAL STATS =====
  const flattened: FlattenedMesureRow[] = useMemo(() => {
    function globalOffset(index: number): number | null {
      let sum = 0;
      for (let i = 0; i <= index; i++) {
        if (i === 0) continue;
        const g = groups[i];
        if (g.storedRelOffset == null) return null;
        sum += g.storedRelOffset;
      }
      return sum;
    }
    const rows: FlattenedMesureRow[] = [];
    groups.forEach((g, gi) => {
      const off = globalOffset(gi);
      g.sections.forEach(sec => {
        sec.mesures.forEach(m => {
          rows.push({
            groupId: g.id,
            sectionId: sec.id,
            mesureId: m.id,
            groupLabel: g.label,
            sectionLabel: sec.label,
            raw: m.raw,
            globalValue: off == null ? null : m.raw + off,
            includeInStats: m.includeInStats === undefined ? true : !!m.includeInStats,
            label: m.label
          });
        });
      });
    });
    return rows;
  }, [groups]);

  const globalStats: GlobalStats | null = useMemo(() => {
    const valides = flattened.filter(r => r.globalValue != null && r.includeInStats);
    if (valides.length === 0) return null;
    const values = valides.map(r => r.globalValue!) as number[];
    const moyenne = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const refRow = statsReferenceMesureId
      ? flattened.find(r => r.mesureId === statsReferenceMesureId && r.globalValue != null)
      : null;
    const ref = refRow?.globalValue ?? null;
    const adjusted = ref != null ? {
      min: min - ref,
      max: max - ref,
      moyenne: moyenne - ref
    } : null;
    return { count: values.length, min, max, moyenne, ref, adjusted };
  }, [flattened, statsReferenceMesureId]);

  // ===== PERSISTENCE (placeholder future) =====
  const serialize = useCallback(() => calculatriceTool.serialize(groups), [groups]);
  const deserialize = useCallback((raw: string) => {
    try {
      const loaded = calculatriceTool.deserialize(raw);
      setGroups(loaded);
      // Re-sélectionner IDs valides
      setCurrentGroupId(loaded[0]?.id || null);
      setCurrentSectionId(loaded[0]?.sections[0]?.id || null);
      setLastError(null);
    } catch (e) {
      setLastError('Erreur de chargement');
    }
  }, []);

  const reset = useCallback(() => {
    const def = calculatriceTool.getDefaultData();
    setGroups(def);
    setCurrentGroupId(def[0]?.id || null);
    setCurrentSectionId(def[0]?.sections[0]?.id || null);
    setStatsReferenceMesureId(null);
    setLastError(null);
  }, []);

  return {
    // Données principales
    groups,
    currentGroup,
    currentSection,
    currentGroupId,
    currentSectionId,
    hasValidChain,
    flattened,
    globalStats,
    statsReferenceMesureId,

    // Sélection
    setCurrentGroupId,
    setCurrentSectionId,
    setStatsReferenceMesureId,

    // Opérations structurelles
    addGroupe,
    removeGroupe,
    addSection,
    renameSection,
    removeSection,

    // Mesures
    addMesure,
    removeMesure,
    toggleIncludeInStats,
    setMesureLabel,
    toggleRefToPrev,
    toggleRefToNext,
    findMesure,

    // Persistance (future)
    serialize,
    deserialize,
    reset,

    // Contrainte & règles
    isLastGroup,
    canAddGroupe,

    // Erreurs
    lastError,
    clearError: () => setLastError(null)
  };
}

export type UseCalculatriceAdvancedReturn = ReturnType<typeof useCalculatriceAdvanced>;
