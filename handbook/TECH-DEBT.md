# Technical Debt Register

| ID | Category | Title | Status | Priority | Exit Criteria |
|----|----------|-------|--------|----------|---------------|
| TD-001 | Build | Node vs Browser surface split | DONE | High | Dual bundles + guard script no forbidden modules |
| TD-002 | Search | Advanced FTS (OR, phrase, highlight) | DONE | Medium | Selftests pass + relevance doc |
| TD-003 | PR Automation | Auto label application | PLANNED | Low | Labels auto appliqués sur PR |
| TD-004 | Metrics | Repository latency instrumentation | PLANNED | Low | p50/p95 exposés Health/Metrics |
| TD-005 | Quality Gate | Lint/tests integration | OPEN | Medium | pr-check supporte flags lint/test |

## TD-001 – Node vs Browser Surface Split
Problem: Build web tire des modules Node. Plan: dual entries + stubs + conditional exports.

Status final:
- Dual entries + conditional exports
- Guard runtime
- Stub browser SQLite + test surface
- CJS wrapper généré
- Critères de sortie atteints

## TD-002 – Advanced FTS (OR, phrase, highlight)
Problem: Recherche limitée au multi-terme AND + scoring naïf, pas d'opérateur OR, pas de phrases, pas de highlight.

Delivered:
- QueryParser AST (terms, phrases, operators AND/OR, groupes parenthésés)
- Normalisation accent folding (NFKD + strip diacritics)
- InMemoryIndexer: OR explicite, phrases exactes, highlight positions (term & phrase)
- SQLite repository: traduction AST → requête MATCH (AND/OR, phrases)
- Fallback LIKE conservant la logique booléenne quand FTS indisponible
- Scoring heuristique (terms = freq, phrase = freq * longueur) + agrégation AND(sum)/OR(max)
- Self-test avancé `scripts/fts-advanced-selftest.ts` couvrant : basique, OR, phrases, combinaisons, highlight, edge cases
- Documentation mise à jour (ARCHITECTURE.md §7) incluant tableau des capacités

Exit Criteria Check:
- Selftests pass: OK (voir sortie script)
- Relevance doc: OK (section Index Strategy mise à jour)

Deferred (hors scope TD-002):
- BM25 / proximity scoring
- Field weighting
- Snippet contextual / windowed highlight
- Prefix / wildcard matching

Status: COMPLETE – aucun action immédiate restante.
