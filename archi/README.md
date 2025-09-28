# Architecture / Handoff Artifacts

This folder contains meta-architecture, governance and self-test artifacts enabling future contributors (human or LLM) to rapidly understand, verify and extend the system.

## Files

- ARCHITECTURE.md – Layer model, flows, event taxonomy, principles.
- GLOSSARY.md – Canonical domain & technical terms (Workspace alias etc.).
- CONTRIBUTING-LLM.md – Interaction & safety rules for autonomous / assisted changes.
- DECISIONS.md – ADR log (append here, never rewrite history; add supersedes notes).
- TEST-MATRIX.md – High level map of what is / isn’t tested yet.
- HANDFOFF.md – Quick onboarding workflow, daily checklist, escalation paths.
- MANIFEST.json – Machine-friendly module inventory for tooling / static analysis.
- scripts/conflict-selftest.ts – Minimal runnable optimistic-locking assertion.

## Quick Start Validation

1. Run the conflict self-test (should print PASS):
   - ts-node archi/scripts/conflict-selftest.ts
2. Inspect MANIFEST.json if adding / renaming modules; keep name + file stable.
3. When adding a service: update MANIFEST.json + ARCHITECTURE.md + maybe GLOSSARY.md.
4. Record any non-trivial design choice in DECISIONS.md (new ADR section at top).

## Automation Ideas (Future)

- Generate MANIFEST.json from code via static scan.
- Lint to ensure every emitted event appears in ARCHITECTURE.md taxonomy.
- Self-test suite aggregator (conflict, migrations, export) for CI smoke.

## Governance Principles

- Prefer additive migrations; deprecate before removal.
- Emit explicit events for all externally observable state mutations.
- Keep handoff docs current; drift > 2 PRs triggers a mandatory doc update task.

---
Maintainer note: If this folder becomes stale, prioritize updating docs before adding new runtime features. Fresh comprehension reduces future refactor cost.
