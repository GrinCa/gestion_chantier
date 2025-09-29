# Technical Debt Archive

Ce fichier contient les dettes clôturées (archivées). Chaque entrée est figée (append-only). Un résumé court ouvre chaque section.

## Sommaire
- [TD-001] Node vs Browser surface split
- [TD-002] Advanced FTS (OR, phrase, highlight)
- [TD-003] Auto label application
- [TD-004] Repository latency instrumentation
- [TD-005] Quality Gate (Lint/tests integration)

---
## TD-001 – Node vs Browser Surface Split
Résumé: Séparation surfaces Node/Browser, guard runtime, bundles dual + CJS wrapper.

Problem: Build web tire des modules Node. Plan: dual entries + stubs + conditional exports.

Status final:
- Dual entries + conditional exports
- Guard runtime
- Stub browser SQLite + test surface
- CJS wrapper généré
- Critères de sortie atteints

Status: COMPLETE.
<!-- TD-001 HASH: TBD -->

---
## TD-002 – Advanced FTS (OR, phrase, highlight)
Résumé: Ajout AST, OR, phrases, highlight positions, normalisation accents, fallback LIKE.

Problem: Recherche limitée au multi-terme AND + scoring naïf, pas d'opérateur OR, pas de phrases, pas de highlight.

Delivered:
- QueryParser AST (terms, phrases, operators AND/OR, groupes parenthésés)
- Normalisation accent folding (NFKD + strip diacritics)
- InMemoryIndexer: OR explicite, phrases exactes, highlight positions (term & phrase)
- SQLite repository: traduction AST → requête MATCH (AND/OR, phrases)
- Fallback LIKE conservant la logique booléenne quand FTS indisponible
- Scoring heuristique (terms = freq, phrase = freq * longueur) + agrégation AND(sum)/OR(max)
- Self-test avancé `scripts/fts-advanced-selftest.ts`
- Documentation mise à jour (ARCHITECTURE.md §7)

Exit Criteria Check:
- Selftests pass: OK
- Relevance doc: OK

Deferred:
- BM25 / proximity scoring
- Field weighting
- Snippet contextual / windowed highlight
- Prefix / wildcard matching

Status: COMPLETE.
<!-- TD-002 HASH: TBD -->

---
## TD-003 – Auto Label Application
Résumé: Workflow GitHub actions auto-applique labels (scope/type/size/risk/debt).

Problem: Manque de cohérence et rapidité dans la catégorisation des PR.

Delivered:
- Workflow `auto-label.yml`
- Script `scripts/apply-pr-labels.mjs`
- Labels scope / type commit / size / risk / debt+issue
- Création auto labels manquants
- Idempotence

Exit Criteria: PR reçoit labels automatiquement: OK
Deferred: Retrait auto labels obsolètes, scoring complexité futur.

Status: COMPLETE.
<!-- TD-003 HASH: TBD -->

---
## TD-004 – Repository Latency Percentiles
Résumé: p50/p95 ajoutés repo & tool, health expose nouvelles métriques.

Problem: Manque de visibilité médiane/p95.

Delivered:
- DurationBucket p50/p95
- MetricsService snapshot enrichi
- HealthService relaie valeurs
- Self-test metrics étendu

Deferred: p99/histogrammes, export Prometheus.

Status: COMPLETE.
<!-- TD-004 HASH: TBD -->

---
## TD-005 – Quality Gate (Lint / Tests Integration)
Résumé: Gate lint baseline no-regression dans pr-check (lint→build→tests).

Problem: Lint massif bloquant adoption (~1350 violations).

Delivered:
- Script `scripts/lint-gate.mjs` baseline
- `.lint-baseline.json`
- Intégration `pr-check`
- Politique no regression + update manuel baseline

Exit Criteria: Gate + tests dans pr-check: OK.
Deferred: Réduction stock hors scope initial, rapport delta, diff ciblé.

Remédiation (phases futures – suivi séparé): P0→P4 (voir archive antérieure ou TECH-DEBT si réactivée).

Status: COMPLETE.
<!-- TD-005 HASH: TBD -->
