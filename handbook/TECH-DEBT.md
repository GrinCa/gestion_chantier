# Technical Debt Register

| ID | Category | Title | Status | Priority | Exit Criteria |
|----|----------|-------|--------|----------|---------------|
| TD-001 | Build | Node vs Browser surface split | OPEN | High | Dual bundles + guard script no forbidden modules |
| TD-002 | Search | Advanced FTS (OR, phrase, highlight) | PLANNED | Medium | Selftests pass + relevance doc |
| TD-003 | PR Automation | Auto label application | PLANNED | Low | Labels auto appliqués sur PR |
| TD-004 | Metrics | Repository latency instrumentation | PLANNED | Low | p50/p95 exposés Health/Metrics |
| TD-005 | Quality Gate | Lint/tests integration | OPEN | Medium | pr-check supporte flags lint/test |

## TD-001 – Node vs Browser Surface Split
Problem: Build web tire des modules Node. Plan: dual entries + stubs + conditional exports.

Progress (skeleton delivered):
- Ajout exports conditionnels `package.json` avec mapping browser/node
- Fichiers `index.browser.ts` & `index.node.ts` générés (dist OK)
- Guard runtime `runtime/env-guard.ts`

Prochaines étapes:
1. Ajouter build CJS node (actuellement placeholder require vers .cjs non généré)
2. Ajouter tests pour vérifier absence de `sqlite3` dans bundle browser
3. Fournir stub browser pour appels nécessitant SQLite (erreur explicite ou no-op)
4. Mettre à jour documentation LLM-ENTRYPOINT sur utilisation des nouvelles entrées
