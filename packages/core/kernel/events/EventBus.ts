/**
 * EventBus.ts
 * ---------------------------------------------------------------------------
 * Bus d'événements en mémoire minimal.
 * Rôle actuel :
 *   - Collecter les abonnements (par opération ou wildcard '*').
 *   - Propager de façon séquentielle les événements émis.
 *
 * Choix assumés :
 *   - Pas de parallélisation des handlers -> ordre déterministe, simplicité.
 *   - Pas de try/catch interne : laisser la responsabilité à l'appelant (facile à ajuster plus tard).
 *   - Implémentation légère pour itérations rapides.
 *
 * Evolutions futures possibles :
 *   - Ajout d'une file persistée (outbox pattern).
 *   - Ajout d'un système de priorités.
 *   - Isolation / sandbox des handlers (timeouts, erreurs contrôlées).
 */

import { DomainEvent, EventHandler } from './DomainEvent.js';

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private wildcardKey = '*';

  /**
   * Enregistre un handler pour une opération spécifique (ex: 'created').
   */
  on(operation: string, handler: EventHandler) {
    const list = this.handlers.get(operation) ?? [];
    list.push(handler);
    this.handlers.set(operation, list);
  }

  /**
   * Enregistre un handler wildcard exécuté pour TOUT événement.
   */
  onAny(handler: EventHandler) {
    this.on(this.wildcardKey, handler);
  }

  /**
   * Emet un événement vers tous les handlers concernés.
   * Ordre d'exécution :
   *   1. Handlers spécifiques à l'opération.
   *   2. Handlers wildcard ('*').
   */
  async emit(event: DomainEvent) {
    const specific = this.handlers.get(event.operation) ?? [];
    for (const h of specific) {
      await h(event);
    }
    const any = this.handlers.get(this.wildcardKey) ?? [];
    for (const h of any) {
      await h(event);
    }
  }
}

// No-op bus pratique (fallback si on ne veut pas brancher d'observateurs)
/**
 * NoopEventBusClass
 * ---------------------------------------------------------------------------
 * Implémentation neutre : utile pour injecter un bus quand on n'a pas encore
 * besoin d'observation mais qu'on veut conserver une signature uniforme.
 */
export class NoopEventBusClass extends EventBus {
  on() { /* noop */ }
  onAny() { /* noop */ }
  async emit() { /* noop */ }
}
export const NoopEventBus = new NoopEventBusClass();
