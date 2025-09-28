# Known Issues

This file captures volatile or evolving issues that should not clutter the stable architecture overview.

| ID | Title | Impact | Status | Last Reviewed | Summary |
|----|-------|--------|--------|---------------|---------|
| KI-001 | Web build fails (Node-only imports in core) | Build blocking for browser bundle; no runtime prod impact yet | ACCEPTED | 2025-09-28 | Vite fails when bundling Node built-ins (`stream`, `fs`, etc.) pulled via core export surface. Requires surface split. |

## KI-001 – Web build fails (Node-only imports in core)

Context:
- `pr:check` build surfaced Vite/Rollup errors caused by Node-specific modules (`stream`, `fs`, `path`, `events`, `util`) referenced (directly or indirectly) by services inside the shared core.
- `ExportService` imports `Readable` from `stream` for NDJSON streaming not needed by browser.
- Future SQLite adapter (native module) would also fail in browser.

Symptoms:
1. Rollup error: `"Readable" is not exported by "__vite-browser-external"`.
2. Externalization warnings for built-ins then hard failure.
3. Concurrent TS hygiene errors (since addressed) obscured root cause initially.

Root Causes:
- Single export surface for both Node and browser consumers.
- Lack of conditional or dual package exports.
- Absence of stubs for streaming / native features in browser context.

Resolution Strategy (Phased):
- Phase 1 (Documentation ✅): Explicitly record issue; avoid ad-hoc hacks.
- Phase 2 (Surface Split ⏳):
  - Restructure: `core/src/node/**` vs `core/src/browser/**`.
  - Introduce conditional exports in package.json.
  - Provide browser-safe entry free of Node imports.
- Phase 3 (Tooling ⏳): Dual build (tsup / rollup) producing `dist/node` and `dist/browser`.
- Phase 4 (Guards ⏳): CI script to scan browser bundle for forbidden modules (regex on output / dependency graph walk).
- Phase 5 (Refinement ⏳): Re-enable optional streaming behind Node-only facade.

Interim Decision:
- Keep issue visible; treat as accepted debt until after immediate roadmap items (FTS Phase 2, PR automation refinements).

Risk Assessment:
- Current: Prevents passing unified build gate; may hide unrelated regressions if skipped.
- Future: Blocks packaging for any prospective web distribution of core utilities.

Exit Criteria:
- Browser build passes with zero Node builtin externalization warnings.
- CI guard script green.
- Architecture doc references only the issue ID.

Owner: (Unassigned – to be picked during next capacity planning)

---

Add new issues by appending a table row and a dedicated section with: Context, Symptoms, Root Cause, Resolution Strategy, Interim Decision, Risk, Exit Criteria.
