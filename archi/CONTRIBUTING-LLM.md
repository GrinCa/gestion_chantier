# CONTRIBUTING (LLM-Aware Guidelines)

These rules are optimized for automated + human collaboration.

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
5. Run quick sanity scripts (quickstart + targeted self-test).
6. Update docs (TODO, Changelog Anchor, MANIFEST if new module).
7. Stop early if ambiguity arises—request clarification instead of guessing wildly.

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
- Self-tests live in `packages/core/scripts/*-selftest.ts`.
- New capability → add `xyz-selftest.ts` validating minimal success + 1 failure path.
- If behavior is performance-sensitive, log metrics in the test output (not enforced yet).

## 7. Repository Etiquette
- Do not introduce external deps without explicit architectural justification.
- Keep SQLite evolution forward-only; add migration scripts rather than altering schema retroactively.
- Keep in-memory and SQLite repository implementations API-compatible.

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

## 11. Support Matrix (Current Gaps)
| Feature | Status | Notes |
|---------|--------|-------|
| Optimistic Lock | ✅ | resource.conflict emitted |
| SQLite Filters | ❌ | TODO (type, updated_at) |
| Export Manifest | ❌ | TODO |
| Conflict Self-Test | ❌ | TODO |
| Workspace Key Migration | ❌ | Needs dual-read plan |

## 12. Escalation Path (LLM)
If blocked:
1. Produce a minimal diff of explored files.
2. Describe ambiguity clearly.
3. Suggest one or two resolution options.
4. Wait for human confirmation.

---
This document evolves—append meaningful policy changes instead of rewriting history.
