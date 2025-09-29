/**
 * CALCULATRICE - Export principal
 * ===============================
 * Point d'entrée pour l'outil calculatrice
 */

// Export public: uniquement le Tool (engine / data manager sont internes)
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