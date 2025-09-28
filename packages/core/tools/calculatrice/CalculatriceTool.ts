/**
 * CALCULATRICE TOOL - Outil calculatrice complet
 * ===============================================
 * API principale pour l'outil calculatrice, combine Engine + DataManager
 */

import { CalculatriceEngine } from './CalculatriceEngine.js';
import { CalculatriceDataManager } from './CalculatriceDataManager.js';
import type { 
  GroupeMesures, 
  Section, 
  Mesure, 
  GroupeStats,
  PersistShape 
} from './types.js';

export class CalculatriceTool {
  private engine: CalculatriceEngine;
  private dataManager: CalculatriceDataManager;

  constructor() {
    this.engine = new CalculatriceEngine();
    this.dataManager = new CalculatriceDataManager();
  }

  // ===== FACTORY METHODS =====

  createMesure(sectionId: string, rawValue: number): Mesure {
    return this.dataManager.createMesure(sectionId, rawValue);
  }

  createSection(label: string): Section {
    return this.dataManager.createSection(label);
  }

  createGroupe(label: string): GroupeMesures {
    return this.dataManager.createGroupe(label);
  }

  // ===== DATA OPERATIONS =====

  // Mesures
  addMesure(groups: GroupeMesures[], groupId: string, sectionId: string, rawValue: number): GroupeMesures[] {
    const updated = this.dataManager.addMesure(groups, groupId, sectionId, rawValue);
    return this.engine.recalculateChain(updated);
  }

  removeMesure(groups: GroupeMesures[], groupId: string, mesureId: string): GroupeMesures[] {
    const updated = this.dataManager.removeMesure(groups, groupId, mesureId);
    return this.engine.recalculateChain(updated);
  }

  updateMesure(groups: GroupeMesures[], groupId: string, mesureId: string, updates: Partial<Mesure>): GroupeMesures[] {
    const updated = this.dataManager.updateMesure(groups, groupId, mesureId, updates);
    return this.engine.recalculateChain(updated);
  }

  // Sections
  addSection(groups: GroupeMesures[], groupId: string, label: string): GroupeMesures[] {
    return this.dataManager.addSection(groups, groupId, label);
  }

  removeSection(groups: GroupeMesures[], groupId: string, sectionId: string): GroupeMesures[] {
    const updated = this.dataManager.removeSection(groups, groupId, sectionId);
    return this.engine.recalculateChain(updated);
  }

  updateSection(groups: GroupeMesures[], groupId: string, sectionId: string, updates: Partial<Section>): GroupeMesures[] {
    return this.dataManager.updateSection(groups, groupId, sectionId, updates);
  }

  // Groupes
  addGroupe(groups: GroupeMesures[], label: string, position?: number): GroupeMesures[] {
    const updated = this.dataManager.addGroupe(groups, label, position);
    return this.engine.recalculateChain(updated);
  }

  removeGroupe(groups: GroupeMesures[], groupId: string): GroupeMesures[] {
    const updated = this.dataManager.removeGroupe(groups, groupId);
    return this.engine.recalculateChain(updated);
  }

  updateGroupe(groups: GroupeMesures[], groupId: string, updates: Partial<GroupeMesures>): GroupeMesures[] {
    return this.dataManager.updateGroupe(groups, groupId, updates);
  }

  reorderGroupes(groups: GroupeMesures[], fromIndex: number, toIndex: number): GroupeMesures[] {
    const updated = this.dataManager.reorderGroupes(groups, fromIndex, toIndex);
    return this.engine.recalculateChain(updated);
  }

  // ===== REFERENCE OPERATIONS =====

  toggleRefToPrev(groups: GroupeMesures[], groupId: string, mesureId: string): {
    groups: GroupeMesures[];
    error?: string;
  } {
    return this.engine.toggleRefToPrev(groups, groupId, mesureId);
  }

  toggleRefToNext(groups: GroupeMesures[], groupId: string, mesureId: string): {
    groups: GroupeMesures[];
    error?: string;
  } {
    return this.engine.toggleRefToNext(groups, groupId, mesureId);
  }

  // ===== CALCULATIONS =====

  calculateGroupStats(group: GroupeMesures): GroupeStats['calculation'] {
    return this.engine.calculateGroupStats(group);
  }

  calculateGroupeStats(groups: GroupeMesures[], group: GroupeMesures): GroupeStats {
    return this.engine.calculateGroupeStats(groups, group);
  }

  getAllGroupsStats(groups: GroupeMesures[]): GroupeStats[] {
    return groups.map(group => this.calculateGroupeStats(groups, group));
  }

  // ===== UTILITIES =====

  findMesureInGroup(group: GroupeMesures, mesureId: string): Mesure | null {
    return this.engine.findMesureInGroup(group, mesureId);
  }

  getAllMesuresFromGroup(group: GroupeMesures): Mesure[] {
    return this.engine.getAllMesuresFromGroup(group);
  }

  globalValue(groups: GroupeMesures[], rawValue: number, group: GroupeMesures): number | null {
    return this.engine.globalValue(groups, rawValue, group);
  }

  // ===== PERSISTENCE =====

  serialize(groups: GroupeMesures[]): string {
    const data = this.dataManager.serialize(groups);
    return JSON.stringify(data);
  }

  deserialize(data: string | PersistShape): GroupeMesures[] {
    return this.dataManager.deserialize(data);
  }

  getDefaultData(): GroupeMesures[] {
    return this.dataManager.getDefaultData();
  }

  // ===== VALIDATION =====

  canSetRefToPrev(groups: GroupeMesures[], groupId: string, mesureId: string): {
    valid: boolean;
    error?: string;
  } {
    return this.engine.canSetRefToPrev(groups, groupId, mesureId);
  }

  canSetRefToNext(groups: GroupeMesures[], groupId: string, mesureId: string): {
    valid: boolean;
    error?: string;
  } {
    return this.engine.canSetRefToNext(groups, groupId, mesureId);
  }

  // ===== BULK OPERATIONS =====

  /**
   * Recalcule entièrement la chaîne de groupes
   */
  recalculateChain(groups: GroupeMesures[]): GroupeMesures[] {
    return this.engine.recalculateChain(groups);
  }

  /**
   * Nettoie les données en supprimant les références invalides
   */
  cleanData(groups: GroupeMesures[]): GroupeMesures[] {
    return groups.map(group => {
      // Vérifier que les références pointent vers des mesures existantes
      const refToPrevExists = group.refToPrevId 
        ? this.findMesureInGroup(group, group.refToPrevId) !== null
        : true;
      const refToNextExists = group.refToNextId
        ? this.findMesureInGroup(group, group.refToNextId) !== null  
        : true;

      return {
        ...group,
        refToPrevId: refToPrevExists ? group.refToPrevId : null,
        refToNextId: refToNextExists ? group.refToNextId : null
      };
    });
  }
}

// ===== EXPORT SINGLETON =====
export const calculatriceTool = new CalculatriceTool();