/**
 * USE CALCULATRICE - Hook React pour l'outil calculatrice
 * =======================================================
 * Interface React pour la logique métier du core
 */

import { useState, useEffect, useCallback } from 'react';
import { calculatriceTool, type GroupeMesures, type GroupeStats } from '@gestion-chantier/core';

export interface UseCalculatriceOptions {
  projectId?: string;
  autoSave?: boolean;
  saveInterval?: number;
}

export function useCalculatrice(options: UseCalculatriceOptions = {}) {
  const { projectId, autoSave = true, saveInterval = 2000 } = options;
  
  // ===== STATE =====
  const [groups, setGroups] = useState<GroupeMesures[]>(() => 
    calculatriceTool.getDefaultData()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ===== DERIVED STATE =====
  const groupsStats = calculatriceTool.getAllGroupsStats(groups);
  const hasValidChain = groups.every((g, i) => i === 0 || g.storedRelOffset !== null);

  // ===== OPERATIONS WRAPPER =====
  const updateGroups = useCallback((newGroups: GroupeMesures[]) => {
    setGroups(newGroups);
    setIsDirty(true);
    setError(null);
  }, []);

  // ===== MESURES OPERATIONS =====
  const addMesure = useCallback((groupId: string, sectionId: string, rawValue: number) => {
    const updated = calculatriceTool.addMesure(groups, groupId, sectionId, rawValue);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const removeMesure = useCallback((groupId: string, mesureId: string) => {
    const updated = calculatriceTool.removeMesure(groups, groupId, mesureId);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const updateMesure = useCallback((groupId: string, mesureId: string, updates: Parameters<typeof calculatriceTool.updateMesure>[3]) => {
    const updated = calculatriceTool.updateMesure(groups, groupId, mesureId, updates);
    updateGroups(updated);
  }, [groups, updateGroups]);

  // ===== SECTIONS OPERATIONS =====
  const addSection = useCallback((groupId: string, label: string) => {
    const updated = calculatriceTool.addSection(groups, groupId, label);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const removeSection = useCallback((groupId: string, sectionId: string) => {
    const updated = calculatriceTool.removeSection(groups, groupId, sectionId);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const updateSection = useCallback((groupId: string, sectionId: string, updates: Parameters<typeof calculatriceTool.updateSection>[3]) => {
    const updated = calculatriceTool.updateSection(groups, groupId, sectionId, updates);
    updateGroups(updated);
  }, [groups, updateGroups]);

  // ===== GROUPES OPERATIONS =====
  const addGroupe = useCallback((label: string, position?: number) => {
    const updated = calculatriceTool.addGroupe(groups, label, position);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const removeGroupe = useCallback((groupId: string) => {
    if (groups.length <= 1) {
      setError("Impossible de supprimer le dernier groupe");
      return;
    }
    const updated = calculatriceTool.removeGroupe(groups, groupId);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const updateGroupe = useCallback((groupId: string, updates: Parameters<typeof calculatriceTool.updateGroupe>[2]) => {
    const updated = calculatriceTool.updateGroupe(groups, groupId, updates);
    updateGroups(updated);
  }, [groups, updateGroups]);

  const reorderGroupes = useCallback((fromIndex: number, toIndex: number) => {
    const updated = calculatriceTool.reorderGroupes(groups, fromIndex, toIndex);
    updateGroups(updated);
  }, [groups, updateGroups]);

  // ===== REFERENCES OPERATIONS =====
  const toggleRefToPrev = useCallback((groupId: string, mesureId: string) => {
    const result = calculatriceTool.toggleRefToPrev(groups, groupId, mesureId);
    if (result.error) {
      setError(result.error);
    } else {
      updateGroups(result.groups);
    }
  }, [groups, updateGroups]);

  const toggleRefToNext = useCallback((groupId: string, mesureId: string) => {
    const result = calculatriceTool.toggleRefToNext(groups, groupId, mesureId);
    if (result.error) {
      setError(result.error);
    } else {
      updateGroups(result.groups);
    }
  }, [groups, updateGroups]);

  // ===== UTILITIES =====
  const findMesure = useCallback((groupId: string, mesureId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? calculatriceTool.findMesureInGroup(group, mesureId) : null;
  }, [groups]);

  const getGroupStats = useCallback((groupId: string): GroupeStats | null => {
    return groupsStats.find(stat => stat.groupId === groupId) || null;
  }, [groupsStats]);

  // ===== PERSISTENCE =====
  const serialize = useCallback(() => {
    return calculatriceTool.serialize(groups);
  }, [groups]);

  const deserialize = useCallback((data: string) => {
    try {
      const loaded = calculatriceTool.deserialize(data);
      setGroups(loaded);
      setIsDirty(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }
  }, []);

  const resetToDefault = useCallback(() => {
    const defaultData = calculatriceTool.getDefaultData();
    setGroups(defaultData);
    setIsDirty(false);
    setError(null);
  }, []);

  // ===== AUTO SAVE =====
  useEffect(() => {
    if (!autoSave || !isDirty || !projectId) return;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const serialized = serialize();
        // TODO: Sauvegarder via DataEngine ou API
        console.log('Auto-save:', serialized);
        setIsDirty(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
      } finally {
        setLoading(false);
      }
    }, saveInterval);

    return () => clearTimeout(timer);
  }, [isDirty, autoSave, projectId, saveInterval, serialize]);

  // ===== RETURN API =====
  return {
    // Data
    groups,
    groupsStats,
    loading,
    error,
    isDirty,
    hasValidChain,

    // Operations - Mesures
    addMesure,
    removeMesure,
    updateMesure,

    // Operations - Sections  
    addSection,
    removeSection,
    updateSection,

    // Operations - Groupes
    addGroupe,
    removeGroupe,
    updateGroupe,
    reorderGroupes,

    // Operations - References
    toggleRefToPrev,
    toggleRefToNext,

    // Utilities
    findMesure,
    getGroupStats,

    // Persistence
    serialize,
    deserialize,
    resetToDefault,

    // Actions
    clearError: () => setError(null)
  };
}