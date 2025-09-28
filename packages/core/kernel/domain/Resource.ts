/**
 * Resource.ts
 * ---------------------------------------------------------------------------
 * Représentation polymorphe d'une unité de donnée métier.
 * Objectif : abstraction unique pour mesures, notes, emails normalisés,
 * pièces jointes logiques, etc.
 *
 * Principes :
 *  - `type` fait le lien avec DataTypeRegistry.
 *  - `version` = version logique d'édition (différent de `schemaVersion`).
 *  - `schemaVersion` = version du schéma payload (migration possible).
 *  - `workspaceId` = contexte (chantier/dossier) → plus tard alias durable.
 */

export interface AttachmentRef {
  id: string;
  mimeType: string;
  size: number;
  hash?: string;
  storageKey: string;
}

export interface ResourceBase {
  id: string;
  type: string;           // correspond à DataTypeDescriptor.type
  workspaceId: string;    // alias potentiel de projectId
  createdAt: number;
  updatedAt: number;
  version: number;        // incrémentation à chaque mutation
  origin?: string;        // user | tool | import
  metadata?: Record<string, any>;
  schemaVersion?: number; // version de payload
}

export interface Resource<TPayload = any> extends ResourceBase {
  payload: TPayload;
  attachments?: AttachmentRef[];
}
