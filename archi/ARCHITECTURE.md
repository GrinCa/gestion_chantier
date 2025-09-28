# Core Architecture Overview

> Version: 1.0 (living document)  
> Scope: Kernel (events, repository, services), DataEngine bridge, Workspace/Resource domain.

---
## 1. Layered Model
| Layer | Role | Key Files |
|-------|------|-----------|
| Domain | Core types & invariants | `kernel/domain/*` |
| Events | Asynchronous observation bus | `kernel/events/EventBus.ts` |
| Repository | Persistence abstraction (in-memory, SQLite) | `kernel/repository/*` |
| Registry | Data types + migrations + validation | `kernel/registry/*` |
| Services | Application orchestration (resources, tools, migration, metrics, health, export) | `kernel/services/*` |
| Bridge | Mirrors DataEngine events to repository/index | `kernel/bridge/DataEngineBridge.ts` |
| Index | In-memory text/index strategy | `kernel/indexer/*` |
| Bootstrap | Factory / wiring | `kernel/bootstrap/*` |
| Auth | Access policy hook | `kernel/auth/AccessPolicy.ts` |

---
## 2. Core Entities
- Workspace (ex Project) — logical container
- Resource — versioned polymorphic data envelope
- DataEntry — legacy lightweight records (will converge into Resource)
- Tool & ToolExecution — plugin runtime + telemetry
- DomainEvent — immutable event record
- Migration Descriptor — upgrade logic for type schema versions

---
## 3. Resource Lifecycle
1. Create → `resource.created` (contains full snapshot)
2. Update → optimistic version increment, partial payload diff → `resource.updated`
3. Conflict → on version mismatch with `expectedVersion` → `resource.conflict`
4. Delete → `resource.deleted` (tombstone via event only; actual row removed)

---
## 4. Event Flow
```
DataEngine.createWorkspace  --> workspace.created
DataEngine.createData       --> data.created
ResourceService.update      --> resource.updated | resource.conflict
ResourceService.delete      --> resource.deleted
ToolExecutionService.run    --> tool.executed
MigrationService.migrate    --> (future) migration.applied (TODO)
ExportService.export        --> (future) export.completed (TODO)
```
Event consumers:
- MetricsService: counts + durations
- DataEngineBridge: transforms data events → repository + index
- Indexer: updates searchable corpus

---
## 5. Versioning & Migrations
- Resource.version: logical revision (optimistic locking)
- schemaVersion: data type schema version (for migration)
- MigrationService: detects outdated resources per workspace & applies migration pipelines.
- Current migrations: note v1→v2, measurement v1→v2 (default unit).

---
## 6. Repositories
Interface (`ResourceRepository`):
- get(id)
- list(workspaceId, query?) → { data, total }
- save(resource)
- delete(id)

Implementations:
- InMemory (simple Map)
- SQLite (stub: CRUD, TODO filters/pagination/index/FTS)

Planned extensions:
- Filter ops: type, updated_at range
- Pagination: limit/offset then cursor
- FTS: virtual table for text fields

---
## 7. Index Strategy
Current: InMemory index keyed by id with extracted searchable tokens (basic).  
Future: Weighted scoring, FTS integration, incremental rebuild script.

---
## 8. Export
ExportService:
- Current: full NDJSON dump (per workspace or all) streaming.
Planned:
- Manifest metadata.json (count, checksum, versions)
- Chunked export (rotate after N lines)
- Incremental export (since timestamp)
- Import pipeline (validation + dry-run)

---
## 9. Metrics & Health
MetricsService snapshot:
```
{
  timestamp,
  events: { 'resource.created': n, ... },
  toolExec: { count, avgDurationMs, p95DurationMs },
  indexSize
}
```
HealthService aggregates:
- Migrations pending
- Index size
- Last event timestamp
- (Future) repository latency & conflicts

---
## 10. Access Control
AccessPolicy (allow-all stub). Planned:
- Role mapping: owner/editor/reader
- Action-specific decision (resource:create/update/delete/export, tool:execute)
- Metrics on access.denied

---
## 11. Workspace Transition Strategy
- Dual naming: wrappers createProject/getProject etc. with @deprecated.
- New canonical: Workspace.
- Storage keys still `project:` → migration script planned (dual-read then rewrite).

---
## 12. Technical Debt / Limitations
- No advanced query filtering (TODO)
- No pagination in list(repository)
- No conflict self-test script yet
- Export lacks manifest
- No repository latency metrics
- No FTS or scoring beyond naive index
- Core package mixes universal (isomorphic) services with Node-only concerns (export streaming, future sqlite adapter) leading to browser build failures when the web workspace attempts to bundle Node built-ins (stream/fs/path). See Section 21.

---
## 13. Planned Scripts
| Script | Purpose | Status |
|--------|---------|--------|
| conflict-selftest.ts | Validate optimistic lock & conflict event | TODO |
| sqlite-filters-selftest.ts | Validate repository filtering | TODO |
| export-manifest-selftest.ts | Validate manifest creation | TODO |
| reindex-selftest.ts | Rebuild index from repository | TODO |
| selftests-all.ts | Aggregate runner | TODO |

---
## 14. Extension Points
| Point | How |
|-------|-----|
| New Data Type | Register in DataTypeRegistry + schema + optional migrate/index strategy |
| New Tool | ToolRegistry.register(tool) + optional input/output schemas |
| New Repo | Implement ResourceRepository + inject in bootstrap |
| New Migration | Add file under `registry/migrations` + register descriptor |

---
## 15. Event Schema (Stable Contract)
| Event | entityType | operation | payload shape (core fields) |
|-------|------------|----------|------------------------------|
| workspace.created | workspace | created | full workspace object |
| workspace.updated | workspace | updated | { updated_at } |
| data.created | data | created | DataEntry full |
| resource.created | resource | created | full resource |
| resource.updated | resource | updated | { diff:boolean, metadata?:boolean } |
| resource.deleted | resource | deleted | { previousVersion } |
| resource.conflict | resource | conflict | { expected, actual } |
| tool.executed | tool | executed | { key, durationMs, success, output? } |

---
## 16. Design Principles
- Incremental Evolution (never break existing API without deprecation)
- Deterministic Side-Effects (events = single source of truth for history)
- Observable by Default (metrics + events before durability features)
- Minimal Lock-In (repositories pluggable)
- Migration First-Class (schema evolution path proven early)

---
## 17. Future Ideas (Parking Lot)
- Conflict merge strategies plugin
- Attachments service (binary + hashing)
- Outbox pattern for external webhook delivery
- Role-based filtering at query time
- Streaming import validator

---
## 18. Changelog Anchor (Human + LLM)
LLM Agents should append summarized deltas here (top):
```
[2025-09-28] Documented browser build failure cause (core Node deps: stream/sqlite3) and deferred fix (layer split planned: core-browser vs core-node). Added pr:check gate exposing issue.
[2025-09-28] Added SQLite FTS multi-term search (AND + heuristic scoring), self-test script, PR template + documented mandatory PR process.
[2025-09-28] Added optimistic locking + resource.conflict events, conflicts surfaced in SyncStatus.
```

---
## 19. Onboarding Checklist (Agent)
1. Read GLOSSARY.md
2. Read ARCHITECTURE.md sections 1–6
3. Inspect MANIFEST.json modules you will touch
4. Run quickstart + (future) selftests-all
5. Update TODO.md after changes
6. Append delta in Changelog Anchor (#18)

---

---
## 20. Pull Request Processus & Template (LLM & Humain)

Tout contributeur (humain ou LLM) doit utiliser le template PR standard lors de toute ouverture de Pull Request.

- **Emplacement du template** : `.github/pull_request_template.md`
- **Obligation** :
  - Remplir chaque section du template (contexte, changements, tests, perf, DB, sécurité, checklist, etc.).
  - Synchroniser la documentation (TEST-MATRIX.md, ARCHITECTURE.md, etc.) avant soumission.
  - Respecter la checklist finale (build, lint, self-tests, doc, atomicité des commits, etc.).
  - Utiliser la variante hotfix ou courte si approprié (voir template).
- **But** :
  - Garantir la traçabilité, la lisibilité et la maintenabilité des évolutions.
  - Permettre à tout LLM ou humain de reprendre le projet sans perte de contexte ou de rigueur.
- **Démarche attendue** :
  1. Préparer la PR sur une branche dédiée (`feat/`, `fix/`, etc.).
  2. Compléter le template PR en justifiant chaque choix et en collant les extraits de self-tests pertinents.
  3. Vérifier la synchronisation de la documentation et la cohérence des scripts/tests.
  4. S’assurer que la checklist finale est entièrement validée avant soumission.
  5. En cas de modification du process, mettre à jour cette section et le template.
- **Lien direct** :
  - [pull_request_template.md](../../.github/pull_request_template.md)

*End of document.*

---
## 21. Known Issue: Web Build Fails on Node-Specific Core Imports

Context:
- After introducing the `pr:check` script (build gate), the web workspace build surfaced failures: Vite externalizes Node built-ins (`stream`, `fs`, `path`, `events`, `util`) and aborts when bundling code from `@gestion-chantier/core`.
- The class `ExportService` currently imports `Readable` from `stream` (Node) purely for a streaming helper not required by the browser.
- Future / experimental SQLite integration also pulls in `sqlite3` (native module) which is never browser-safe.

Symptoms Observed:
1. Rollup/Vite error: `"Readable" is not exported by "__vite-browser-external"` (indicates a Node builtin path substitution).
2. Multiple externalized module warnings (fs/path/events/util) followed by build failure.
3. TypeScript strict mode messages (TS1484 / TS1294) appeared concurrently, giving the impression of a cascade; they are orthogonal (see below).

Root Causes:
- Lack of separation between browser-safe core (domain, repository interfaces, services without Node APIs) and Node-only adapters (export streaming, sqlite drivers, future file system features).
- The web package compiles against the entire exported surface of `@gestion-chantier/core`.
- Strict TypeScript base config (via `expo/tsconfig.base`) enabling `verbatimModuleSyntax` triggered required `import type` hygiene; parameter properties triggered TS1294 under composite/erasure mode.

Deferred Resolution Plan (Phased):
Phase 1 (Quick Mitigation - OPTIONAL, skipped for now): Remove or conditionally guard streaming method using lazy dynamic import inside `ExportService` so browser tree-shaking drops it.
Phase 2 (Structural):
  - Move Node-only constructs into `packages/core/node/` (e.g. `export/ExportService.node.ts`, `sqlite/SQLiteAdapter.ts`).
  - Provide a lightweight `ExportService` browser stub exporting only serializable NDJSON (no streaming API) or omit entirely.
  - Add conditional exports in `packages/core/package.json`:
    ```json
    {
      "exports": {
        ".": {
          "browser": "./dist/browser/index.js",
          "default": "./dist/node/index.js"
        }
      }
    }
    ```
Phase 3 (Tooling Integration): Add a build step generating dual bundles (Node / Browser) & adjust Vite alias if needed.
Phase 4 (Documentation & Tests): Self-test ensuring web build does not pull Node-only modules (CI guard).

Interim Decision:
- Issue documented; implementation deferred to keep focus on feature roadmap (FTS Phase 2, PR automation hardening). Build gate intentionally exposes the problem to prevent silent coupling.

TypeScript Side Notes:
- Errors TS1484 (type-only imports) resolved progressively by converting value-less imports to `import type`.
- Errors TS1294 were mitigated by removing parameter property shorthand in service constructors.
- The internal `erasableSyntaxOnly` mode is *not* configurable; adapting code is the correct solution.

Action Items (Open):
- [ ] Split node/browser surfaces (Phase 2).
- [ ] Add conditional exports (Phase 2).
- [ ] Provide browser stub or feature flag for streaming export.
- [ ] Introduce build self-test: detect forbidden Node built-ins in browser bundle (regex on rollup output).
- [ ] Re-enable streaming once isolated behind Node boundary.

Status: ACCEPTED DEBT (tracked here; no immediate functional risk, only build coupling).
