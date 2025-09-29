/**
 * CALCULATRICE ENGINE - Moteur de calcul métier
 * =============================================
 * Logique pure pour les calculs de mesures, moyennes et références
 */

import type { 
  Mesure, 
  Section, 
  GroupeMesures, 
  CalculationResult, 
  ReferenceCalculation,
  GroupeStats 
} from './types.js';

export class CalculatriceEngine {
  
  // ===== UTILITAIRES DE BASE =====
  
  /**
   * Trouve une mesure dans un groupe par son ID
   */
  findMesureInGroup(group: GroupeMesures, mesureId: string): Mesure | null {
    for (const section of group.sections) {
      const mesure = section.mesures.find(m => m.id === mesureId);
      if (mesure) return mesure;
    }
    return null;
  }

  /**
   * Récupère toutes les mesures d'un groupe (toutes sections confondues)
   */
  getAllMesuresFromGroup(group: GroupeMesures): Mesure[] {
    return group.sections.flatMap(section => section.mesures);
  }

  /**
   * Filtre les mesures à inclure dans les statistiques
   */
  getMesuresForStats(group: GroupeMesures): Mesure[] {
    return this.getAllMesuresFromGroup(group)
      .filter(m => m.includeInStats !== false);
  }

  // ===== CALCULS STATISTIQUES =====

  /**
   * Calcule la moyenne, min, max, écart-type d'un groupe
   */
  calculateGroupStats(group: GroupeMesures): CalculationResult {
    const mesures = this.getMesuresForStats(group);
    
    if (mesures.length === 0) {
      return {
        moyenne: 0,
        min: 0,
        max: 0,
        ecartType: 0,
        count: 0
      };
    }

    const values = mesures.map(m => m.raw);
    const count = values.length;
    const moyenne = values.reduce((sum, val) => sum + val, 0) / count;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calcul écart-type
    const variance = values.reduce((sum, val) => sum + Math.pow(val - moyenne, 2), 0) / count;
    const ecartType = Math.sqrt(variance);

    return {
      moyenne: Math.round(moyenne * 1000) / 1000, // Arrondi à 3 décimales
      min,
      max,
      ecartType: Math.round(ecartType * 1000) / 1000,
      count
    };
  }

  // ===== CALCULS DE RÉFÉRENCES =====

  /**
   * Récupère la valeur de référence vers le groupe précédent
   */
  refToPrevOfGroup(group: GroupeMesures): number | null {
    if (!group.refToPrevId) return null;
    const mesure = this.findMesureInGroup(group, group.refToPrevId);
    return mesure ? mesure.raw : null;
  }

  /**
   * Récupère la valeur de référence vers le groupe suivant
   */
  refToNextOfGroup(group: GroupeMesures): number | null {
    if (!group.refToNextId) return null;
    const mesure = this.findMesureInGroup(group, group.refToNextId);
    return mesure ? mesure.raw : null;
  }

  /**
   * Calcule l'offset global d'un groupe par rapport au premier
   */
  globalOffsetOfGroup(groups: GroupeMesures[], targetGroup: GroupeMesures): number | null {
    const targetIndex = groups.findIndex(g => g.id === targetGroup.id);
    if (targetIndex === -1) return null;

    let sum = 0;
    for (let i = 0; i <= targetIndex; i++) {
      if (i === 0) continue; // Premier groupe = référence absolue
      
      const group = groups[i];
      if (group.storedRelOffset == null) return null;
      sum += group.storedRelOffset;
    }
    return sum;
  }

  /**
   * Calcule la valeur globale d'une mesure (valeur brute + offset global)
   */
  globalValue(groups: GroupeMesures[], rawValue: number, group: GroupeMesures): number | null {
    const offset = this.globalOffsetOfGroup(groups, group);
    if (offset == null) return null;
    return rawValue + offset;
  }

  // ===== RECALCULS DE CHAÎNE =====

  /**
   * Recalcule tous les offsets relatifs de la chaîne de groupes
   */
  recalculateChain(groups: GroupeMesures[]): GroupeMesures[] {
    const result = [...groups];
    
    for (let i = 1; i < result.length; i++) {
      const prevGroup = result[i - 1];
      const currentGroup = result[i];
      
      const prevRefToNext = prevGroup.refToNextId 
        ? this.findMesureInGroup(prevGroup, prevGroup.refToNextId) 
        : null;
      const currentRefToPrev = currentGroup.refToPrevId 
        ? this.findMesureInGroup(currentGroup, currentGroup.refToPrevId) 
        : null;
      
      if (prevRefToNext && currentRefToPrev) {
        currentGroup.storedRelOffset = prevRefToNext.raw - currentRefToPrev.raw;
      } else {
        // Casse la chaîne à partir de ce point
        currentGroup.storedRelOffset = null;
        for (let j = i + 1; j < result.length; j++) {
          result[j].storedRelOffset = null;
        }
        break;
      }
    }
    
    return result;
  }

  // ===== VALIDATION =====

  /**
   * Valide qu'une référence vers le précédent est possible
   */
  canSetRefToPrev(groups: GroupeMesures[], groupId: string, mesureId: string): {
    valid: boolean;
    error?: string;
  } {
    const groupIndex = groups.findIndex(g => g.id === groupId);
    
    if (groupIndex === 0) {
      return {
        valid: false,
        error: "Impossible de pointer vers le haut depuis la première position."
      };
    }

    const prevGroup = groups[groupIndex - 1];
    if (!prevGroup.refToNextId) {
      return {
        valid: false,
        error: "Vous devez d'abord définir une mesure ↓ dans la position précédente."
      };
    }

    return { valid: true };
  }

  /**
   * Valide qu'une référence vers le suivant est possible
   */
  canSetRefToNext(groups: GroupeMesures[], groupId: string, mesureId: string): {
    valid: boolean;
    error?: string;
  } {
    const groupIndex = groups.findIndex(g => g.id === groupId);
    // Ancienne règle: interdiction sur la dernière position. On l'autorise désormais
    // pour préparer l'ajout d'une future position (la mesure servira de refToNext
    // quand une nouvelle position sera créée et définira sa refToPrev).
    if (groupIndex === -1) {
      return { valid: false, error: 'Groupe introuvable' };
    }
    return { valid: true };
  }

  // ===== OPERATIONS SUR LES RÉFÉRENCES =====

  /**
   * Active/désactive une référence vers le groupe précédent
   */
  toggleRefToPrev(groups: GroupeMesures[], groupId: string, mesureId: string): {
    groups: GroupeMesures[];
    error?: string;
  } {
    const validation = this.canSetRefToPrev(groups, groupId, mesureId);
    if (!validation.valid) {
      return { groups, error: validation.error };
    }

    const updated = groups.map(g => {
      if (g.id !== groupId) return g;
      const newRefToPrevId = g.refToPrevId === mesureId ? null : mesureId;
      return { ...g, refToPrevId: newRefToPrevId };
    });

    return { groups: this.recalculateChain(updated) };
  }

  /**
   * Active/désactive une référence vers le groupe suivant
   */
  toggleRefToNext(groups: GroupeMesures[], groupId: string, mesureId: string): {
    groups: GroupeMesures[];
    error?: string;
  } {
    const validation = this.canSetRefToNext(groups, groupId, mesureId);
    if (!validation.valid) {
      return { groups, error: validation.error };
    }

    const updated = groups.map(g => {
      if (g.id !== groupId) return g;
      const newRefToNextId = g.refToNextId === mesureId ? null : mesureId;
      return { ...g, refToNextId: newRefToNextId };
    });

    return { groups: this.recalculateChain(updated) };
  }

  // ===== CALCULS COMPLETS =====

  /**
   * Calcule toutes les statistiques d'un groupe avec références
   */
  calculateGroupeStats(groups: GroupeMesures[], group: GroupeMesures): GroupeStats {
    const calculation = this.calculateGroupStats(group);
    const hasValidMesures = calculation.count > 0;

    const reference: ReferenceCalculation = {
      globalValue: hasValidMesures 
        ? this.globalValue(groups, calculation.moyenne, group) 
        : null,
      refToPrev: this.refToPrevOfGroup(group),
      refToNext: this.refToNextOfGroup(group),
      adjustedValue: null // Sera calculé si nécessaire
    };

    return {
      groupId: group.id,
      groupLabel: group.label,
      calculation,
      reference,
      hasValidMesures
    };
  }
}