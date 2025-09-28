/**
 * KernelContext.ts
 * ---------------------------------------------------------------------------
 * Fabrique centralisée de contextes d'exécution (outils, services applicatifs).
 * Fournit un accès contrôlé aux services noyau : repository, eventBus, clock,
 * utilisateur courant, workspace courant.
 *
 * Objectif : éviter la prolifération de paramètres et préparer l'injection
 * future (tests, multi-tenant, instrumentation, permissions fines).
 */

import { EventBus } from './events/EventBus.js';
import type { ResourceRepository } from './repository/ResourceRepository.js';

export interface KernelContextConfig {
  eventBus: EventBus;
  repository: ResourceRepository;
  currentUserProvider?: () => string | null;
  currentWorkspaceProvider?: () => string | null;
  nowFn?: () => number;
}

export interface KernelContext {
  events: EventBus;
  repo: ResourceRepository;
  now(): number;
  currentUser(): string | null;
  workspaceId(): string | null;
}

export function createKernelContext(cfg: KernelContextConfig): KernelContext {
  return {
    events: cfg.eventBus,
    repo: cfg.repository,
    now: () => (cfg.nowFn ? cfg.nowFn() : Date.now()),
    currentUser: () => (cfg.currentUserProvider ? cfg.currentUserProvider() : null),
    workspaceId: () => (cfg.currentWorkspaceProvider ? cfg.currentWorkspaceProvider() : null)
  };
}
