/**
 * DataTypeRegistry.ts
 * ---------------------------------------------------------------------------
 * Registre des "data types" déclaratifs.
 * Un DataTypeDescriptor permet :
 *  - Validation (validate)
 *  - Migration (migrate)
 *  - Indexation (indexStrategy)
 *
 * But : Supporter l'extension progressive sans modifier le noyau.
 */

import type { ZodSchema } from 'zod';

export interface DataTypeDescriptor {
  type: string;                      // Nom stable (ex: 'measurement')
  schemaVersion: number;             // Version courante du schéma payload
  schema?: ZodSchema<any>;           // Schéma Zod optionnel
  validate?(value: any): void;       // Lève une erreur si invalide (complément / legacy)
  migrate?(value: any, fromVersion: number): any; // Migration ascendante
  indexStrategy?(value: any): Record<string, any>; // Extraction champs indexables
}

export class DataTypeRegistry {
  private types = new Map<string, DataTypeDescriptor>();

  /**
   * Enregistre un type. Erreur si doublon.
   */
  register(desc: DataTypeDescriptor) {
    if (this.types.has(desc.type)) {
      throw new Error(`Data type already registered: ${desc.type}`);
    }
    this.types.set(desc.type, desc);
  }

  /**
   * Retourne la description d'un type.
   */
  get(type: string): DataTypeDescriptor | undefined {
    return this.types.get(type);
  }

  /**
   * Valide une valeur selon le type si schéma disponible.
   * - Priorité: schema Zod -> validate() custom -> aucun (passe).
   * Retourne éventuellement la valeur transformée par Zod (parse).
   */
  validate(type: string, value: any): any {
    const desc = this.types.get(type);
    if (!desc) throw new Error(`Unknown data type: ${type}`);
    if (desc.schema) {
      return desc.schema.parse(value); // peut lancer
    }
    if (desc.validate) {
      desc.validate(value); // peut lancer
    }
    return value;
  }

  /**
   * Liste snapshot des types.
   */
  list(): DataTypeDescriptor[] {
    return [...this.types.values()];
  }
}

export const globalDataTypeRegistry = new DataTypeRegistry();
