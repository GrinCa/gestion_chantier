/**
 * DomainEvent.ts
 * ---------------------------------------------------------------------------
 * Format standardisé des événements utilisés à l'intérieur du noyau.
 *
 * Objectifs principaux :
 *  - Fournir une structure minimale mais expressive (audit, sync, projections).
 *  - Être agnostique du mécanisme de transport (in-memory aujourd'hui, outbox / persistance demain).
 *  - Permettre l'extension contrôlée via le champ `meta` sans casser l'API.
 *
 * Recommandations d'usage :
 *  - `operation` doit rester une action courte et normalisée (ex: "created", "updated", "deleted", "executed").
 *  - `entityType` sert à discriminer les projections (ex: "project", "resource", "tool").
 *  - `payload` contient soit un snapshot, soit un delta : choisir une convention projet (actuellement snapshot privilégié).
 *  - `version` reflète la version courante de l'entité après l'opération (utile pour la résolution de conflits).
 *  - `actor` = identifiant utilisateur ou "system" / "tool:<key>".
 *
 * Evolutions futures possibles :
 *  - Ajout d'un champ `correlationId` ou `traceId` (utilisable déjà via `meta`).
 *  - Segmentation en EventStore persistant avec compression des snapshots.
 */

export interface DomainEvent<T = any> {
  id: string;
  entityType: string;        // Ex: 'project' | 'resource' | 'user' | 'tool'
  entityId: string;          // Identifiant principal impacté
  operation: string;         // Ex: 'created' | 'updated' | 'deleted' | 'executed'
  timestamp: number;         // Epoch ms
  version?: number;          // Version de l'entité après mutation
  actor?: string;            // User ou système
  payload: T;                // Données associées (snapshot ou delta)
  meta?: Record<string, any>; // Extension libre (trace id, correlation id...)
}

/**
 * EventHandler
 * ---------------------------------------------------------------------------
 * Fonction appelée lors de l'émission d'un événement via l'EventBus.
 * Peut être synchrone ou asynchrone.
 * Les handlers doivent idéalement :
 *  - NE PAS lancer d'exception non-capturée (loguer et continuer)
 *  - Être idempotents si réémission potentielle (replay futur)
 */
export type EventHandler = (event: DomainEvent) => Promise<void> | void;
