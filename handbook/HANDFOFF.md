# Handoff Guide (Human + LLM)

## Quick Start
1. Read `GLOSSARY.md` (shared vocabulary)
2. Skim `ARCHITECTURE.md` sections 1–6
3. Open `TODO.md` & `TEST-MATRIX.md`
4. Inspect target service in `MANIFEST.json`
5. Run quick sanity: `npm run quickstart --workspace=packages/core`
6. Pick one task → apply minimal patch → add/update self-test
7. Update: TODO.md, DECISIONS.md (if architectural), ARCHITECTURE.md (#18 anchor)

## Decision Flow
```
Need new capability?
  ↳ Does it change public API? yes → add deprecation plan
  ↳ Does it emit new event? yes → document Event Schema
  ↳ Needs persistence? choose repo (memory/sqlite) or add adapter
  ↳ Affects migrations? update MigrationService tests
```

## Minimal Patch Pattern
```
// 1. Add feature flag / optional param
// 2. Implement narrow behavior
// 3. Emit event
// 4. Update tests (happy + 1 failure)
// 5. Update docs & manifest if new module
```

## Conflict Handling (Current)
- Caller sets `expectedVersion` in ResourceService.update
- Mismatch → throws + event `resource.conflict`
- DataEngine aggregates recent conflicts (max 50)
- Future: strategy plugin (merge or prefer-latest)

## Migration Handling
```
pending = migrationService.pendingMigrations(workspaceId)
if (pending.total > 0) migrationService.migrateWorkspace(workspaceId)
```

## When Unsure
- Prefer to leave a TODO with rationale instead of guessing
- Record open question in DECISIONS.md as “Pending” block

## Output Expectations (LLM)
Each change message should include:
- What changed (1–2 lines)
- Files touched list
- Any new events or schema fields
- Follow-up tasks (if any)

## Clean-Up Queue (Rolling)
- Replace storage key prefix `project:` → `workspace:`
- Add Export manifest
- Add Repository filters
- Add Conflict self-test

## Anti-Drop Checklist Before Stopping
[ ] All new public methods documented or self-explanatory
[ ] Events documented if added
[ ] Tests or selftests updated/added
[ ] TODO.md status adjusted
[ ] DECISIONS.md updated if strategic
[ ] No obvious console.log debug left

---
This guide is intentionally concise—combined with MANIFEST & ARCHITECTURE it forms the complete context kit.
