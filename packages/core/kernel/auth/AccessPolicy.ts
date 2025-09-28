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

/**
 * RoleBasedAccessPolicy
 * Rôles supportés: owner, editor, reader
 * Règles:
 *  - owner: tout (toutes actions)
 *  - editor: resource:create/update, tool:execute, export:run (pas delete, pas migration)
 *  - reader: aucune écriture; uniquement tool:execute si tool explicite, pas export, pas migration
 *  - défaut (sans rôle): deny
 *  - migration:run réservé owner
 *  - resource:delete réservé owner
 *  - export:run owner + editor
 */
export type AccessRole = 'owner' | 'editor' | 'reader';

export interface RoleResolver {
  resolve(ctx: AccessContext): Promise<AccessRole | null> | AccessRole | null;
}

export class StaticRoleResolver implements RoleResolver {
  constructor(private role: AccessRole | null){ }
  resolve(): AccessRole | null { return this.role; }
}

export class RoleBasedAccessPolicy implements AccessPolicy {
  constructor(private resolver: RoleResolver){ }
  async can(action: AccessAction, ctx?: AccessContext): Promise<boolean> {
    const role = await this.resolver.resolve(ctx || {});
    if (!role) return false;
    if (role === 'owner') return true; // owner full access
    if (role === 'editor') {
      if (action === 'resource:create' || action === 'resource:update' || action === 'tool:execute' || action === 'export:run') return true;
      return false; // editor ne peut pas delete ni migration
    }
    if (role === 'reader') {
      // Reader: uniquement tool:execute (lecture implicite plus tard hors policy) -- pas export
      return action === 'tool:execute';
    }
    return false;
  }
}

/**
 * InstrumentedAccessPolicy: wrap une policy pour émettre event access.denied
 * Requiert un eventBus shape minimal { emit(type,payload) }
 */
export interface EventEmitterLike { emit?(type: string, payload: any): void; }

export class InstrumentedAccessPolicy implements AccessPolicy {
  constructor(private inner: AccessPolicy, private events?: EventEmitterLike){ }
  async can(action: AccessAction, ctx?: AccessContext): Promise<boolean> {
    const allowed = await this.inner.can(action, ctx);
    if (!allowed) {
      this.events?.emit?.('access.denied', { action, ctx, at: Date.now() });
    }
    return allowed;
  }
}