/**
 * AccessPolicy.ts
 * ---------------------------------------------------------------------------
 * Politique d'accès minimale (production ready lite):
 * - Interface générique can(action, subjectType, context)
 * - Implémentation AllowAllAccessPolicy
 * - Enum d'actions standardisées pour resources/tools
 */

export type AccessAction =
  | 'resource:create'
  | 'resource:update'
  | 'resource:delete'
  | 'tool:execute'
  | 'migration:run'
  | 'export:run';

export interface AccessContext {
  userId?: string | null;
  workspaceId?: string | null;
  resourceType?: string;
  toolKey?: string;
  extra?: Record<string, any>;
}

export interface AccessPolicy {
  can(action: AccessAction, ctx?: AccessContext): Promise<boolean> | boolean;
}

export class AllowAllAccessPolicy implements AccessPolicy {
  can(): boolean { return true; }
}

export class DenyAllAccessPolicy implements AccessPolicy {
  can(): boolean { return false; }
}

// Helper synchrone pour usage rapide
export const allowAllPolicy = new AllowAllAccessPolicy();