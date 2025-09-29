# Technical Debt Register

| ID | Category | Title | Status | Priority | Exit Criteria |
|----|----------|-------|--------|----------|---------------|
| TD-001 | Build | Node vs Browser surface split | DONE | High | Dual bundles + guard script no forbidden modules |
| TD-002 | Search | Advanced FTS (OR, phrase, highlight) | DONE | Medium | Selftests pass + relevance doc |
| TD-003 | PR Automation | Auto label application | DONE | Low | Labels auto appliqués sur PR |
| TD-004 | Metrics | Repository latency instrumentation | DONE | Low | p50/p95 exposés Health/Metrics |
| TD-005 | Quality Gate | Lint/tests integration | DONE | Medium | pr-check supporte flags lint/test + lint gate baseline |

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

## TD-003 – Auto Label Application
Problem: Manque de cohérence et rapidité dans la catégorisation des PR (revue plus lente, filtres imprécis).

Delivered:
- Workflow GitHub Actions `auto-label.yml` (événements: opened / synchronize / reopened / ready_for_review)
- Script `scripts/apply-pr-labels.mjs` (Node 18) réutilisant la config `pr-automation.config.json`
- Catégories → labels `scope:<cat>` (docs, scripts, server, frontend, mobile, core, web, search)
- Détection type commit → `type:<feat|fix|docs|chore|refactor|test|perf|ci|build>`
- Heuristiques taille additions → `size:s|m|l|xl`
- Règles risque: volume (`risk:high`) ou surface sensible (`risk:elevated`)
- Détection dettes / issues via motifs `TD-00X` → `debt:TD-00X`, `KI-00X` → `issue:KI-00X`
- Création automatique des labels manquants (couleur neutre)
- Idempotent (n'ajoute pas les labels déjà présents)

Exit Criteria Check:
- PR reçoit automatiquement les labels lors des mises à jour: OK

Deferred:
- Suppression automatique de labels devenus obsolètes (choix: éviter de retirer un label ajouté manuellement)
- Mapping score de complexité (ex: profondeur répertoires) -> futur possible

Status: COMPLETE.

## TD-004 – Repository Latency Percentiles
Problem: Seule la moyenne et le p95 partiel (tool exec + repo) étaient disponibles – pas de p50 consolidé pour observer médiane ni p95 sur toutes les opérations out‑of‑the‑box.

Delivered:
- Extension `DurationBucket` → calcule maintenant p50 et p95.
- `MetricsService.snapshot()` expose pour chaque op repo: `avgMs`, `p50Ms`, `p95Ms`.
- `toolExec` inclut `p50DurationMs` + renommage interne cohérent.
- `HealthService` relaie ces valeurs (pas de changement de structure additionnel, compat ascendante).
- Self-test `metrics-selftest.ts` étendu: génère un jeu d'opérations pour valider présence p50/p95.

Exit Criteria Check:
- p50 / p95 visibles dans snapshot repository & toolExec: OK
- Test de non-régression enrichi: OK

Deferred:
- p99 / histogrammes bucketisés (option déjà listée Section Observabilité Phase 2)
- Export Prometheus / OpenMetrics (hors scope actuel)

Status: COMPLETE.

## TD-005 – Quality Gate (Lint / Tests Integration)
Problem: Aucune barrière de régression lint – exécution brute (`eslint .`) échouait (~1350 violations) bloquant adoption. Besoin d'une approche progressive sans freiner le flux.

Delivered:
- Script `scripts/lint-gate.mjs` implémentant un mode baseline no‑regression.
- Génération fichier `.lint-baseline.json` (snapshot counts par (fichier, règle)).
- Commande npm `lint:gate` utilisée par `pr-check` (lint avant build/tests).
- Politique: aucun (file,rule) ne doit dépasser son count baseline; nouveaux fichiers doivent être propres; améliorations (réduction) acceptées sans mise à jour.
- Option mise à jour contrôlée: `node scripts/lint-gate.mjs --update` (ou env `LINT_GATE_UPDATE=1`) pour régénérer baseline après refactor massif.
- Intégration dans `scripts/pr-check.mjs` (step "Lint Gate").

Exit Criteria Check:
- pr-check exécute lint gate + tests: OK
- Flags de skip (`PR_CHECK_SKIP_LINT`, `PR_CHECK_SKIP_BUILD`, `PR_CHECK_SKIP_TESTS`) fonctionnels: OK

Deferred / Next:
- Réduire progressivement le total (1357 → 0) via refactors ciblés (pas partie de cette dette, suivi continu Section 10 / Section 11 selon surface).
- Ajout d'un rapport delta positif automatisé (stat slack / console détaillée) – optionnel futur.
- Couverture lint différentielle sur diff précis (git diff parsing) – amélioration potentielle (actuel: full scan + comparaison baseline).

Status: COMPLETE – Quality Gate Phase 1 en place (prévention régression). Transition vers réduction incrémentale hors dette.
