# Technical Debt Register

Purpose: Track structural or strategic debt items distinct from transient bugs. Each item should have a clear remediation path and exit criteria.

| ID | Category | Title | Status | Priority | Notes |
|----|----------|-------|--------|----------|-------|
| TD-001 | Build/Packaging | Node vs Browser surface split | OPEN | High | Blocks clean web build & future packaging flexibility |
| TD-002 | Search | FTS advanced features (OR, phrase, highlight) | PLANNED | Medium | Roadmap after stability & build isolation |
| TD-003 | PR Automation | Auto label application via API | PLANNED | Low | Config exists; implementation pending |
| TD-004 | Metrics | Repository latency + pagination instrumentation | PLANNED | Low | Add timing + page size histograms |
| TD-005 | Quality Gate | Lint/tests integration in pr:check | OPEN | Medium | Build gate exists; extend with optional flags |

## TD-001 – Node vs Browser Surface Split
- Problem: Single export surface forces browser build to ingest Node-only modules.
- Plan: Dual entrypoints + conditional exports + stubs.
- Exit Criteria: Browser build passes; CI guard ensures no Node built-ins.

## TD-002 – Advanced FTS Features
- Scope: Add OR queries, phrase search, snippet highlighting, improved scoring (BM25-style weighting prototype).
- Dependencies: Stable SQLite adapter boundary.
- Exit Criteria: Query planner tests + relevance evaluation script.

## TD-003 – PR Auto Labels
- Idea: Use classification results to assign GitHub labels (if token has scope).
- Steps: Map category -> label; idempotent PATCH to issues endpoint.
- Exit Criteria: PRs show labels automatically within 5s of script run.

## TD-004 – Repository Latency Metrics
- Need: Visibility into storage adapter performance for scaling decisions.
- Plan: Wrap adapter ops with timing; export histogram to metrics service.
- Exit Criteria: Dashboard displays p50/p95 for CRUD ops.

## TD-005 – Extended Quality Gate
- Enhancement: Add ESLint + targeted test invocation behind env toggles.
- Plan: Parse env flags (CHECK_LINT=1, CHECK_TEST=1); fail fast with summary.
- Exit Criteria: Gate script supports modular checks; docs updated.

---
Template for new debt items:

## TD-XYZ – Title
- Problem:
- Plan:
- Exit Criteria:
