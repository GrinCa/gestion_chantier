/**
 * ToolRegistry.ts
 * ---------------------------------------------------------------------------
 * Registre central des outils "exécutables" (plugins fonctionnels métiers).
 * Chaque outil fournit :
 *   - un identifiant stable `key`
 *   - une version (pour compatibilité future / migrations)
 *   - une fonction `execute` isolant la logique.
 *
 * Non-objectifs (pour l'instant) :
 *   - Gestion des dépendances entre outils
 *   - Gestion d'un cycle de vie (init/dispose)
 *   - Permissions -> gérées à un autre niveau (auth/authorization layer)
 */

/**
 * ToolContext : contrat minimal passé à un outil lors de son exécution.
 * Étendu ultérieurement (repository, eventBus, etc.) via adaptation locale
 * pour ne pas lier précocement le coeur à trop de dépendances.
 */
export interface ToolContext {
  now(): number;                 // Horodatage (facilitant le test / override)
  currentUser(): string | null;  // Identifiant utilisateur courant
  workspaceId(): string | null;  // Contexte logique (chantier / dossier)
}

export interface ToolDefinition<I = any, O = any> {
  key: string;                                // Identifiant unique stable
  name: string;                               // Nom humain
  version: string;                            // Version logique outil
  execute(input: I, ctx: ToolContext): Promise<O>; // Coeur métier
  description?: string;                       // Aide / doc courte
  tags?: string[];                            // Classification libre
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /**
   * Enregistre un outil. Lève une erreur si la clé est déjà utilisée.
   */
  register(tool: ToolDefinition) {
    if (this.tools.has(tool.key)) {
      throw new Error(`Tool already registered: ${tool.key}`);
    }
    this.tools.set(tool.key, tool);
  }

  /**
   * Retourne un outil enregistré ou undefined.
   */
  get<T = any, R = any>(key: string): ToolDefinition<T, R> | undefined {
    return this.tools.get(key) as ToolDefinition<T, R> | undefined;
  }

  /**
   * Liste tous les outils (copie snapshot du registre).
   */
  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }
}

export const globalToolRegistry = new ToolRegistry();
