# CONTRIBUTING (LLM-Aware Guidelines – Full Monorepo)

These rules are optimized for automated + human collaboration across EVERY package (`core`, `web`, `mobile`, `server`, future packages). Core a servi de référence; cette version généralise.

## 1. Core Principles
1. Do not remove public APIs without a deprecation phase.
2. Every observable behavior change must have: implementation + (script self-test OR unit test).
3. Emit events for domain state changes; never silently mutate critical state.
4. Keep patches minimal: only touch what the task requires.
5. Prefer additive migrations over destructive rewrites.
6. Update `archi/TODO.md` & Changelog Anchor after meaningful changes.

## 2. Patch Workflow (Agent)
1. Read `archi/ARCHITECTURE.md` sections 1–6.
2. Read `archi/TODO.md` and select one pending task.
3. Prepare a tiny plan (list of files to touch + expected events/tests).
4. Apply patch using diff tool (avoid mass formatting).
5. Immediately stage & commit the logical change (atomic commit: feature OR doc OR test) using conventional message (feat|fix|docs|chore|refactor|test). Ne pas accumuler de multiples changements non liés dans un seul commit.
6. Run quick sanity scripts (quickstart + targeted self-test) – if failure, fix and amend commit.
7. Update docs (TODO, Changelog Anchor, MANIFEST if new module) in a separate docs(commit) juste après; commit séparé.
8. Stop early if ambiguity arises—request clarification instead of guessing wildly.

## 3. Events Policy
| When | Emit |
|------|------|
| Resource created | resource.created |
| Resource updated | resource.updated |
| Version conflict | resource.conflict |
| Resource deleted | resource.deleted |
| Tool executed | tool.executed |
| (Future) Migration applied | migration.applied |
| (Future) Export completed | export.completed |

If you add a new event: document in ARCHITECTURE.md (Event Schema table) + update Glossary if concept is new.

## 4. Naming Conventions
| Context | Pattern |
|---------|--------|
| Events | snake (resource.created) |
| Types/Interfaces | PascalCase |
| Methods | camelCase |
| File names | kebab or descriptive (ResourceService.ts) |
| Feature Flags | UPPER_SNAKE |

## 5. Deprecations
Use JSDoc:
```
/** @deprecated Use createWorkspace */
```
Maintain wrappers for at least one transitional iteration before removal.

## 6. Testing Guidance
- Core self-tests: `packages/core/scripts/*-selftest.ts` (déjà en place).
- Web UI tests (à introduire) : `packages/web/src/__selftests__/*.tsx` (smoke rendering + hook behavior) – minimal placeholder à créer avant changements UI majeurs.
- Mobile tests (future) : `packages/mobile/src/__selftests__/*.tsx` (expo + logic sans dépendances réseau).
- Server tests: `packages/server/tests/*.ts` (API contract & auth + error paths) – si absent, créer `server-selftest.ts` script minimal ping + user route.
- Nouvelle capability → ajouter `xyz-selftest.ts` validant succès + 1 scénario d’échec.
- Performance sensible : log métriques (p95) dans la sortie (tolérance actuelle: non bloquant).

Test Mapping Convention (Fichier modifié → Tests à lancer avant commit):
| Change Type | Examples | Run At Minimum |
|-------------|----------|----------------|
Core service logic | `ResourceService.ts`, `SQLiteResourceRepository.ts` | Related *-selftest + aggregate impacted (repo, migration, export) |
Core schema / registry | `registry/builtins.ts` | validation-selftest, migration-selftest |
Export / manifest | `ExportService.ts` | export-selftest, export-manifest-selftest |
DataEngine | `data-engine/index.ts` | kernel-selftest, bridge-selftest |
Web hook/component | `packages/web/src/...` | (future) web-smoke-selftest |
Mobile screen/hook | `packages/mobile/src/...` | (future) mobile-smoke-selftest |
Server route | `packages/server/index.js` or handlers | (future) server-selftest |
Docs only | `archi/*.md` | none (lint if introduced) |

Automation Roadmap:
1. Script `scripts/changed-selftests.mjs` : map git diff → recommended selftests.
2. Pre-commit hook (opt-in) : exécute mapping, bloque si échec.
3. CI matrix: core fast tests (parallel) + web/mobile smoke + server contract.
4. Badge coverage (futur Istanbul / vitest integration).

## 7. Repository Etiquette (Global)
- N’ajoute pas de dépendance externe sans justification (archi/DECISIONS.md si structurante).
- Pas de version majeure de lib sans vérifier scripts de build des autres packages.
- SQLite : forward-only; toute altération de schéma → script de migration.
- InMemory vs SQLite doivent rester isomorphes pour tests.
- Web/Mobile : éviter d’introduire du state global hors providers contrôlés.
- Server : endpoints nouveaux → documenter param & output dans README ou future OpenAPI.

## 8. Large Changes
For multi-step refactors (e.g., project_id → workspace_id):
1. Introduce alias / compatibility layer.
2. Dual-write / dual-read.
3. Backfill migration script.
4. Switch primary usage.
5. Remove legacy after stability confirmation.

## 9. Anti-Patterns (Avoid)
- Silent catch blocks swallowing logic errors.
- Introducing stateful singletons that bypass injection.
- Hard-coding environment-specific paths.
- Exporting unvalidated user input.

## 10. Checklist Template (Copy & Fill)
```
Task: <id>
Goal:
Files:
Events Affected:
Tests:
Risks:
Post-Change Actions:
```

## 11. Support Matrix (Current Gaps – Monorepo)
| Area | Feature | Status | Notes |
|------|---------|--------|-------|
| Core | Optimistic Lock | ✅ | resource.conflict emitted |
| Core | SQLite Filters & Pagination | ✅ | Basic LIKE; FTS planned |
| Core | Export Manifest | ✅ | Add hash + incremental v2 |
| Core | Conflict Self-Test | ✅ | `archi/scripts/conflict-selftest.ts` |
| Core | Workspace Key Migration | ❌ | Dual-read strategy pending |
| Web | Smoke Rendering Tests | ❌ | Add minimal mount test |
| Mobile | Hook/Screen Selftest | ❌ | Add Expo logic test harness |
| Server | API Selftest | ❌ | Basic ping + CRUD route test |
| DevX | changed-selftests script | ❌ | Automate mapping |
| Observability | Repo latency metrics | ❌ | Wrap repository methods |
| Security | Role-based AccessPolicy | ❌ | Extend policy + tests |

## 12. Escalation Path (LLM)
If blocked:
1. Produce a minimal diff of explored files.
2. Describe ambiguity clearly.
3. Suggest one or two resolution options.
4. Wait for human confirmation.

---
This document evolves—append meaningful policy changes instead of rewriting history.

---
## 13. Monorepo Atomic Commit Standard
| Category | Prefix | Example |
|----------|--------|---------|
| Core feature | feat(core) | feat(core): add FTS virtual table |
| Web UI | feat(web) | feat(web): workspace list hook |
| Mobile | feat(mobile) | feat(mobile): add offline banner |
| Server | feat(server) | feat(server): add /health endpoint |
| Tests | test(core) | test(core): add reindex selftest |
| Docs | docs(archi) | docs(archi): add FTS design notes |
| Chore | chore(repo) | chore(repo): add changed-selftests script |
| Refactor | refactor(core) | refactor(core): extract query builder |

Rule: un commit = une intention claire; en cas de mélange code+doc, préférer deux commits consécutifs.

---
## 14. Future Enforcements (Planned)
- Linter custom: interdiction d’appeler wrappers `createProject` hors compat layer.
- Script de vérification MANIFEST vs fichiers réels (alerte en CI).
- Génération automatique d’un `ARCHI-SUMMARY.md` pour onboarding rapide.
- Ajout d’un test d’intégrité “event taxonomy” (tous les events émis listés dans ARCHITECTURE.md).

---
## 15. Itération Rapide Locale (Sans Scripts Supplémentaires)
Usage recommandé pour développer rapidement sans réintroduire le loader expérimental :
1. Ouvrir un terminal watch: `npm run dev --workspace=packages/core` (génère en continu `dist/`).
2. Dans un second terminal, lancer un self-test compilé ciblé (ex: `npm run resource-service-selftest --workspace=packages/core`).
3. Répéter modification → test sans rebuild manuel (le watcher le fait déjà).

Pourquoi pas de mode :fast séparé ? Tant que le build reste rapide (< ~10s), on évite la complexité d’un deuxième chemin (ts-node) et les warnings Node.

Indicateur pour réévaluer : si cycle moyen (> modification + test) dépasse 15s sur série de petits changements, envisager ajout d’un script fast ou smart runner.

