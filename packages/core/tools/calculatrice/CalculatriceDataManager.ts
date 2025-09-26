/**
 * CALCULATRICE DATA MANAGER - Gestionnaire de données
 * ===================================================
 * Gestion de la persistance, migrations et opérations CRUD
 */

import type { 
  GroupeMesures, 
  Section, 
  Mesure,
  PersistShape,
  PersistShapeV1,
  PersistShapeV2,
  PersistShapeV3,
  PersistShapeV4,
  MesureOperation,
  GroupeOperation,
  SectionOperation
} from './types.js';

export class CalculatriceDataManager {
  
  // ===== GÉNÉRATION D'IDS =====
  
  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).slice(2);
  }

  // ===== FACTORY METHODS =====

  createMesure(sectionId: string, rawValue: number): Mesure {
    return {
      id: this.generateId(),
      raw: rawValue,
      isRef: false,
      createdAt: Date.now(),
      sectionId,
      includeInStats: true
    };
  }

  createSection(label: string): Section {
    return {
      id: this.generateId(),
      label,
      mesures: [],
      createdAt: Date.now()
    };
  }

  createGroupe(label: string): GroupeMesures {
    return {
      id: this.generateId(),
      label,
      sections: [this.createSection("Section 1")],
      refToPrevId: null,
      refToNextId: null,
      storedRelOffset: null
    };
  }

  // ===== MIGRATIONS DE DONNÉES =====

  /**
   * Migre les données vers la dernière version
   */
  migrateData(data: PersistShape): GroupeMesures[] {
    switch (data.version) {
      case 1:
        return this.migrateFromV1(data as PersistShapeV1);
      case 2:  
        return this.migrateFromV2(data as PersistShapeV2);
      case 3:
        return this.migrateFromV3(data as PersistShapeV3);
      case 4:
        return data.groups; // Version actuelle
      default:
        console.warn('Version inconnue, retour aux données par défaut');
        return this.getDefaultData();
    }
  }

  private migrateFromV1(data: PersistShapeV1): GroupeMesures[] {
    // Migration V1 -> V4 (via V2 et V3)
    const v2Data = { version: 2 as const, groups: data.groups };
    return this.migrateFromV2(v2Data);
  }

  private migrateFromV2(data: PersistShapeV2): GroupeMesures[] {
    // Migration V2 (mesures directes) -> V3 (sections)
    const migratedGroups = data.groups.map(oldGroup => {
      const mesures = oldGroup.mesures || [];
      const section: Section = {
        id: this.generateId(),
        label: "Section 1",
        mesures: mesures.map((m: any) => ({
          ...m,
          sectionId: this.generateId(), // Assigner l'ID de section
          includeInStats: m.includeInStats !== false
        })),
        createdAt: Date.now()
      };

      return {
        ...oldGroup,
        sections: [section],
        mesures: undefined // Supprimer l'ancien champ
      };
    });

    const v3Data = { version: 3 as const, groups: migratedGroups };
    return this.migrateFromV3(v3Data);
  }

  private migrateFromV3(data: PersistShapeV3): GroupeMesures[] {
    // Migration V3 -> V4 (ajout des labels et stats)
    return data.groups.map(group => ({
      ...group,
      sections: group.sections.map(section => ({
        ...section,
        mesures: section.mesures.map(mesure => ({
          ...mesure,
          label: mesure.label || undefined,
          includeInStats: mesure.includeInStats !== false
        }))
      }))
    }));
  }

  /**
   * Données par défaut si aucune donnée n'existe
   */
  getDefaultData(): GroupeMesures[] {
    return [
      this.createGroupe("Position 1"),
      this.createGroupe("Position 2")
    ];
  }

  // ===== OPERATIONS CRUD - MESURES =====

  addMesure(groups: GroupeMesures[], groupId: string, sectionId: string, rawValue: number): GroupeMesures[] {
    return groups.map(group => {
      if (group.id !== groupId) return group;
      
      return {
        ...group,
        sections: group.sections.map(section => {
          if (section.id !== sectionId) return section;
          
          const newMesure = this.createMesure(sectionId, rawValue);
          return {
            ...section,
            mesures: [...section.mesures, newMesure]
          };
        })
      };
    });
  }

  removeMesure(groups: GroupeMesures[], groupId: string, mesureId: string): GroupeMesures[] {
    return groups.map(group => {
      if (group.id !== groupId) return group;
      
      return {
        ...group,
        sections: group.sections.map(section => ({
          ...section,
          mesures: section.mesures.filter(m => m.id !== mesureId)
        })),
        // Nettoyer les références si la mesure supprimée était référencée
        refToPrevId: group.refToPrevId === mesureId ? null : group.refToPrevId,
        refToNextId: group.refToNextId === mesureId ? null : group.refToNextId
      };
    });
  }

  updateMesure(groups: GroupeMesures[], groupId: string, mesureId: string, updates: Partial<Mesure>): GroupeMesures[] {
    return groups.map(group => {
      if (group.id !== groupId) return group;
      
      return {
        ...group,
        sections: group.sections.map(section => ({
          ...section,
          mesures: section.mesures.map(mesure => {
            if (mesure.id !== mesureId) return mesure;
            return { ...mesure, ...updates };
          })
        }))
      };
    });
  }

  // ===== OPERATIONS CRUD - SECTIONS =====

  addSection(groups: GroupeMesures[], groupId: string, label: string): GroupeMesures[] {
    return groups.map(group => {
      if (group.id !== groupId) return group;
      
      const newSection = this.createSection(label || `Section ${group.sections.length + 1}`);
      return {
        ...group,
        sections: [...group.sections, newSection]
      };
    });
  }

  removeSection(groups: GroupeMesures[], groupId: string, sectionId: string): GroupeMesures[] {
    return groups.map(group => {
      if (group.id !== groupId) return group;
      
      // Ne pas supprimer s'il n'y a qu'une section
      if (group.sections.length <= 1) return group;
      
      const updatedSections = group.sections.filter(s => s.id !== sectionId);
      
      // Nettoyer les références aux mesures de cette section
      const sectionToRemove = group.sections.find(s => s.id === sectionId);
      let cleanedGroup = { ...group, sections: updatedSections };
      
      if (sectionToRemove) {
        const mesureIdsToClean = sectionToRemove.mesures.map(m => m.id);
        if (mesureIdsToClean.includes(group.refToPrevId || '')) {
          cleanedGroup.refToPrevId = null;
        }
        if (mesureIdsToClean.includes(group.refToNextId || '')) {
          cleanedGroup.refToNextId = null;
        }
      }
      
      return cleanedGroup;
    });
  }

  updateSection(groups: GroupeMesures[], groupId: string, sectionId: string, updates: Partial<Section>): GroupeMesures[] {
    return groups.map(group => {
      if (group.id !== groupId) return group;
      
      return {
        ...group,
        sections: group.sections.map(section => {
          if (section.id !== sectionId) return section;
          return { ...section, ...updates };
        })
      };
    });
  }

  // ===== OPERATIONS CRUD - GROUPES =====

  addGroupe(groups: GroupeMesures[], label: string, position?: number): GroupeMesures[] {
    const newGroupe = this.createGroupe(label || `Position ${groups.length + 1}`);
    
    if (position === undefined) {
      return [...groups, newGroupe];
    }
    
    const result = [...groups];
    result.splice(position, 0, newGroupe);
    return result;
  }

  removeGroupe(groups: GroupeMesures[], groupId: string): GroupeMesures[] {
    return groups.filter(g => g.id !== groupId);
  }

  updateGroupe(groups: GroupeMesures[], groupId: string, updates: Partial<GroupeMesures>): GroupeMesures[] {
    return groups.map(group => {
      if (group.id !== groupId) return group;
      return { ...group, ...updates };
    });
  }

  reorderGroupes(groups: GroupeMesures[], fromIndex: number, toIndex: number): GroupeMesures[] {
    const result = [...groups];
    const [moved] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, moved);
    return result;
  }

  // ===== SÉRIALISATION =====

  /**
   * Sérialise les données pour la persistance
   */
  serialize(groups: GroupeMesures[]): PersistShapeV4 {
    return {
      version: 4,
      groups
    };
  }

  /**
   * Désérialise les données depuis la persistance
   */
  deserialize(data: string | PersistShape): GroupeMesures[] {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return this.migrateData(parsed);
    } catch (error) {
      console.error('Erreur lors de la désérialisation:', error);
      return this.getDefaultData();
    }
  }
}