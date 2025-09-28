/**
 * CALCULATRICE TYPES - Types métier purs
 * ======================================
 * Types pour l'outil calculatrice, partagés entre Web et Mobile
 */

// Labels prédéfinis pour les mesures spécifiques
export const LABELS_PREDEFINIS = [
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

export type LabelPredefini = typeof LABELS_PREDEFINIS[number];

// ===== TYPES DE BASE =====

export interface Mesure {
  id: string;
  raw: number;
  isRef: boolean;
  createdAt: number;
  sectionId: string;
  label?: string;
  includeInStats?: boolean;
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
  sections: Section[];
  refToPrevId?: string | null;
  refToNextId?: string | null;
  storedRelOffset?: number | null;
}

// ===== TYPES POUR CALCULS =====

export interface CalculationResult {
  moyenne: number;
  min: number;
  max: number;
  ecartType: number;
  count: number;
}

export interface ReferenceCalculation {
  globalValue: number | null;
  refToPrev: number | null;
  refToNext: number | null;
  adjustedValue: number | null;
}

export interface GroupeStats {
  groupId: string;
  groupLabel: string;
  calculation: CalculationResult;
  reference: ReferenceCalculation;
  hasValidMesures: boolean;
}

// ===== TYPES POUR PERSISTENCE =====

export interface PersistShapeV1 { 
  version: 1; 
  groups: any[] 
}

export interface PersistShapeV2 { 
  version: 2; 
  groups: any[] 
}

export interface PersistShapeV3 { 
  version: 3; 
  groups: GroupeMesures[] 
}

export interface PersistShapeV4 { 
  version: 4; 
  groups: GroupeMesures[] 
}

export type PersistShape = PersistShapeV1 | PersistShapeV2 | PersistShapeV3 | PersistShapeV4;

// ===== TYPES POUR OPERATIONS =====

export interface MesureOperation {
  type: 'add' | 'remove' | 'update' | 'toggleRef' | 'toggleStats';
  groupId: string;
  sectionId?: string;
  mesureId?: string;
  data?: Partial<Mesure>;
}

export interface GroupeOperation {
  type: 'add' | 'remove' | 'update' | 'reorder';
  groupId?: string;
  data?: Partial<GroupeMesures>;
  position?: number;
}

export interface SectionOperation {
  type: 'add' | 'remove' | 'update' | 'reorder';
  groupId: string;
  sectionId?: string;
  data?: Partial<Section>;
  position?: number;
}