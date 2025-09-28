# Roadmap Architecture Noyau Multi-Données

Ce document trace la base de l'architecture cible pour transformer l'application en moteur de gestion multi-données (projets / ressources / emails / mesures / notes / fichiers / exécutions d'outils).

---
## 1. Noyau (Core Kernel)
Arborescence cible (dans `packages/core`):
```
core/
  kernel/
    domain/
    events/
    storage/
    registry/
    auth/
    tools/
    sync/
    validation/
```
Rôles:
- domain: types métier + invariants
- events: bus interne + format d'événements
- storage: interfaces + adaptateurs + cache
- registry: enregistrement dynamique des data types & tools
- tools: contrat d'exécution plugin
- sync: logique versions + reprise offline
- validation: schémas + migrations

---
## 2. Modèle de données conceptuel
Entités clés:
- User (rôles, permissions)
- Workspace (ou Project) (contexte logique)
- Resource (polymorphe) -> payload + metadata + attachments
- DataEntry (peut fusionner avec Resource selon évolution)
- Attachment (binaire + métadonnées)
- Tool + ToolExecution (trace d'exécution)
- Event (journal append-only)
- Metadata (clé/valeur + tags)
- IndexRecord (entrée d'index recherche)

Exemple Resource:
```ts
interface ResourceBase {
  id: string;
  type: string;            // measurement | email | note | ...
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  origin?: string;
  metadata?: Record<string, any>;
}
interface AttachmentRef {
  id: string;
  mimeType: string;
  size: number;
  hash?: string;
  storageKey: string;
}
interface Resource<TPayload = any> extends ResourceBase {
  payload: TPayload;
  attachments?: AttachmentRef[];
}
```

---
## 3. Journal d'événements (Event Log)
Format:
```ts
interface DomainEvent<T = any> {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;       // created | updated | deleted | attached ...
  timestamp: number;
  version?: number;
  actor?: string;
  payload: T;              // delta ou snapshot
}
```
Utilités: audit, sync, projections, replay futur.

---
## 4. Accès aux données (Repository + Query)
```ts
interface QueryOptions {
  filter?: Array<{ field: string; op: 'eq'|'in'|'lt'|'gt'|'contains'; value: any }>;
  sort?: Array<{ field: string; dir: 'asc'|'desc' }>;
  limit?: number;
  offset?: number;
  fullText?: string;
  types?: string[];
}
interface ResourceRepository {
  get(id: string): Promise<Resource|null>;
  list(workspaceId: string, query?: QueryOptions): Promise<{ data: Resource[]; total: number }>;
  save(resource: Resource): Promise<Resource>;
  delete(id: string): Promise<void>;
}
```
`Indexer` optionnel pour recherche texte + champs:
```ts
interface Indexer {
  index(resource: Resource): Promise<void>;
  search(workspaceId: string, q: string, limit: number): Promise<Resource[]>;
  remove(id: string): Promise<void>;
}
```

---
## 5. Offline / Sync
Stratégie initiale: version + updated_at, résolution simple (last-write + hook merge). Interface:
```ts
interface ConflictResolver {
  resolve(local: Resource, remote: Resource): Resource;
}
```
Extensions futures: CRDT light, tombstones.

---
## 6. Couches Logicielles
| Couche | Rôle |
|--------|------|
| Core Domain | Types + invariants |
| Kernel Services | Repos + Events + Index + Sync orchestrator |
| Application Services | Use-cases (CreateMeasurement...) |
| Adapters | SQLite / IndexedDB / REST... |
| Interface | Web / Expo |
| Workers | Indexation / ingestion |
| Plugins Tools | Calculatrice, Import Email... |

---
## 7. Tool Runtime (plugins)
Contrat:
```ts
interface ToolContext {
  repo: ResourceRepository;
  events: EventBus;
  now(): number;
  currentUser: () => string;
  workspaceId: () => string;
}
interface ToolDefinition<I = any, O = any> {
  key: string;
  name: string;
  version: string;
  inputSchema?: any;
  outputSchema?: any;
  execute(input: I, ctx: ToolContext): Promise<O>;
}
```
`ToolRegistry` gère l'enregistrement et la découverte.

---
## 8. DataType Registry
```ts
interface DataTypeDescriptor {
  type: string;
  schema: any;
  indexStrategy?: (resource: Resource) => Record<string, any>;
  validate?(resource: Resource): void;
  migrate?(resource: Resource, fromVersion: number): Resource;
}
```
Gestion centralisée des types et migrations.

---
## 9. Migrations & Versioning
- Champ `schemaVersion` dans payload.
- Fichier par migration: `migrations/{type}/vX.ts`.
- Upgrade à la lecture si nécessaire.

---
## 10. Sécurité & Permissions
- Phase 1: RBAC simple (admin/user + tools assignés).
- Phase 2: permissions fines (ex: `resource.create:measurement`).
- Phase 3: capabilities dynamiques.
```ts
interface Authorization {
  can(userId: string, action: string, context?: any): Promise<boolean>;
}
```

---
## 11. Observabilité
- Logger interface.
- Metrics: events/sec, sync backlog, tool exec time.
- HealthReporter: état cache, pending sync, last event.

---
## 12. Ingestion Emails / Fichiers (futur)
Pipeline: Source Adapter -> Normalizer -> Resource(email) -> Index -> Classification -> Attachments.

---
## 13. Stratégie Stockage Progressive
| Phase | Local | Serveur | Fichiers |
|-------|-------|---------|----------|
| 1 | localStorage / AsyncStorage | SQLite/Express | FS local |
| 2 | IndexedDB / SQLite | PostgreSQL | S3 compatible |
| 3 | +Cache (Redis) | Postgres partitionné | CDN + S3 |

---
## 14. Roadmap Phasée
Phase 1 (Stabilisation):
- [x] Resource (interface de base) ✅ (`kernel/domain/Resource.ts`)
- [x] ToolRegistry squelettes ✅ (`kernel/tools/ToolRegistry.ts`)
- [x] DataTypeRegistry squelette ✅ (`kernel/registry/DataTypeRegistry.ts`)
- [x] EventBus in-memory ✅ (`kernel/events/EventBus.ts`)
- [x] Émission d'événements basique DataEngine (createProject, createData, sync) ✅
- [ ] Alias Project → Workspace (progressif)

Phase 2 (Structuration):
- [x] Repository + QueryOptions implémentés ✅ (`kernel/repository/ResourceRepository.ts` InMemory)
- [x] KernelContext (fabrique contextes) ✅ (`kernel/KernelContext.ts`)
- [x] Bridge DataEngine -> ResourceRepository (écoute events) ✅ (`kernel/bridge/DataEngineBridge.ts`)
- [x] ResourceService création + update + versioning ✅ (`kernel/services/ResourceService.ts`)
- [ ] Validation (Zod) + premières migrations
- [x] Versionnement simple (Resource.version) ✅ (incrémente dans ResourceService)
 - [x] MigrationService basique + migration note v1->v2 (category) ✅

Phase 3 (Extensibilité):
 - [x] ToolExecution log ✅ (`kernel/services/ToolExecutionService.ts` + tool.executed event)
- [x] Indexer naïf ✅ (`kernel/indexer/*` + events resource.*)
- [ ] Sync status enrichi
 - [x] Suppression + events resource.deleted + désindexation ✅ (ResourceService.delete + IndexSubscriber)

Phase 4 (Fonctionnel):
- [ ] Attachment storage abstraction
- [ ] Stub ingestion email
- [ ] Export pipeline générique

Phase 5 (Qualité):
- [ ] Metrics + health endpoint
  - [x] MetricsService basique (events, tool exec, index size) ✅ (`kernel/services/MetricsService.ts` + metrics-selftest)
- [ ] Jeu de données test charge

Phase 6 (Scaling):
- [ ] Adapter PostgreSQL
- [ ] Worker indexation
- [ ] Webhooks/outbox

---
## 15. Extraits Code (Référence)
EventBus:
```ts
export interface EventHandler { (e: DomainEvent): Promise<void>|void; }
export class EventBus {
  private handlers = new Map<string, EventHandler[]>();
  on(type: string, h: EventHandler) { const list = this.handlers.get(type) ?? []; list.push(h); this.handlers.set(type, list); }
  async emit(event: DomainEvent) {
    const target = this.handlers.get(event.operation) ?? []; for (const h of target) await h(event);
    const wildcard = this.handlers.get('*') ?? []; for (const h of wildcard) await h(event);
  }
}
```
ToolExecutionService (esquisse):
```ts
export class ToolExecutionService {
  constructor(private registry: ToolRegistry, private ctxFactory: () => ToolContext) {}
  async run(key: string, input: any) {
    const tool = this.registry.get(key); if (!tool) throw new Error(`Tool not found: ${key}`);
    const ctx = this.ctxFactory(); const started = Date.now();
    const output = await tool.execute(input, ctx);
    return { output, duration: Date.now() - started };
  }
}
```

---
## 16. Tests
- Unitaires: migrations, repository, conflits, tools.
- Intégration: create resource → event → index → requête.
- Charge: génération 10k resources + timings.

---
## 17. Principes Directeurs
| Principe | Application |
|----------|-------------|
| Extensibilité | Registries + interfaces stables |
| Observabilité | Events + metrics structurées |
| Offline-first | Pending sync + stockage local |
| UI-agnostique | Core sans dépendance React |
| Sécurité évolutive | RBAC -> capabilities |
| Migration continue | schemaVersion + pipeline upgrade |
| Clarté | Terminologie stable (Resource, Workspace, Tool) |
| Scalabilité progressive | Adapters interchangeables |

---
## 18. Prochaines Actions Proposées
1. (FAIT) Créer EventBus + DataTypeRegistry + ToolRegistry.
2. (FAIT) Ajouter types de base: measurement + note (DataTypeRegistry/builtins).
3. Adapter DataEngine progressivement vers ResourceRepository (façade non destructive).
4. (FAIT) Émission d'événements createProject/createData.
5. (FAIT) Script de test interne `core:kernel-selftest`.
6. Introduire un premier DataTypeDescriptor `measurement` avec validation simple.
7. Préparer un `KernelContext` pour uniformiser ToolContext futur.

---
### Statut Synthétique (Dernière mise à jour)
✅ Kernel initial posé (EventBus, Resource, Registries)
✅ Repository in-memory initial
✅ KernelContext posé (injection unifiée)
🔄 Prochaine cible: adaptation progressive DataEngine -> ResourceRepository + début index externe
⏳ En attente: alias Workspace, validation formelle, migrations, indexation

---
### Documentation rapide des fichiers noyau ajoutés
| Fichier | Rôle | Points clés |
|---------|------|-------------|
| `kernel/events/DomainEvent.ts` | Format événement | Structure stable, extensible via `meta`, support futur audit/sync |
| `kernel/events/EventBus.ts` | Diffusion en mémoire | Handlers séquentiels, wildcard, Noop bus injectable |
| `kernel/tools/ToolRegistry.ts` | Registre outils | Enregistrement unique, isolation logique exécution |
| `kernel/registry/DataTypeRegistry.ts` | Registre types | Validation/migration/indexStrategy extensibles |
| `kernel/registry/builtins.ts` | Types intégrés | measurement + note enregistrés |
| `kernel/domain/Resource.ts` | Abstraction de donnée | Unifie modèles hétérogènes, prépare alias Workspace |
| `kernel/index.ts` | Export agrégé | Gateway contrôlée des primitives noyau |
| `core/index.ts` (maj) | Expose kernel | Marqué expérimental pour usage progressif |
| `kernel/repository/ResourceRepository.ts` | Accès Resource + query | InMemory + index textuel naïf + filtres |

Fin du document.
