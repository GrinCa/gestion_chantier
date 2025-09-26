/**
 * CALCULATRICE - Export principal
 * ===============================
 * Point d'entrée pour l'outil calculatrice
 */

// Classes principales
export { CalculatriceEngine } from './CalculatriceEngine.js';
export { CalculatriceDataManager } from './CalculatriceDataManager.js';
export { CalculatriceTool, calculatriceTool } from './CalculatriceTool.js';

// Types
export type {
  Mesure,
  Section,
  GroupeMesures,
  CalculationResult,
  ReferenceCalculation,
  GroupeStats,
  PersistShape,
  PersistShapeV1,
  PersistShapeV2,
  PersistShapeV3,
  PersistShapeV4,
  MesureOperation,
  GroupeOperation,
  SectionOperation,
  LabelPredefini
} from './types.js';

// Constantes
export { LABELS_PREDEFINIS } from './types.js';

// Instance par défaut prête à l'emploi
import { calculatriceTool } from './CalculatriceTool.js';
export default calculatriceTool;