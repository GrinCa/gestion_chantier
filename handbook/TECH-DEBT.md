# Technical Debt Register (Ultra-Minimal)

Philosophie: "Si c'est DONE, ça disparaît". L'historique vit dans Git ou, si vraiment nécessaire, dans `TECH-DEBT-ARCHIVE.md` (optionnel). Ce fichier ne liste **que** les dettes encore ouvertes et leurs critères de sortie.

## Dettes Ouvertes

| ID | Catégorie | Titre | Priorité | Exit Criteria |
|----|-----------|-------|----------|---------------|
| TD-007 | DevX | Self-test subset runner (changed-selftests) | Medium | Script `changed-selftests.mjs` détecte fichiers modifiés → mapping tests, options `--since`, `--list`, `--run`, tableau synthèse |

## Détail Actif
### TD-007 Self-test subset runner
Contexte:
La commande actuelle `npm run selftest:all --workspace=packages/core` exécute l'ensemble des self-tests, même lorsque peu de fichiers changent. Cela rallonge le feedback loop et décourage la création de nouveaux scripts selftests granulaires.

Objectifs:
- Détecter dynamiquement l'ensemble minimal de self-tests affectés par un diff récent.
- Offrir un mode `--list` (affichage sans exécution) et `--run` (exécution séquentielle avec résumé).
- Paramètre `--since <ref>` (par défaut HEAD~1) + support `--staged` pour utiliser l'index Git.
- Mapping extensible (table interne: glob(s)/prefix → scripts selftest).

Surface initiale (mapping proposé):
| Paths changé contient | Selftests à inclure |
|-----------------------|---------------------|
| kernel/repository | repository-selftest, metrics-selftest, deletion-selftest |
| kernel/services/MetricsService | metrics-selftest |
| kernel/services/HealthService | health-selftest |
| kernel/services/ExportService | export-selftest, export-manifest-selftest |
| kernel/indexer | indexer-selftest, reindex-selftest |
| tools/calculatrice | tool-execution-selftest |
| migration | migration-selftest, measurement-migration-selftest, sqlite-migration-selftest |
| sqlite | sqlite-filters-selftest, sqlite-migration-selftest |
| data-engine | bridge-selftest, bootstrap-selftest |
| scripts/ (core) | kernel-selftest |

Exit Criteria:
- Script `scripts/changed-selftests.mjs` implémenté avec: parse args, git diff collection, mapping, exécution ordonnée, codes de sortie clairs (0 si succès, 1 si échec test, 2 si aucun test mappé mais changement détecté).
- Affichage final: tableau synthèse (Test | Status | Duration ms).
- Documentation ajoutée (GIT-WORKFLOW.md) section Outils.
- Intégration simple dans pipeline local (optionnel: mention dans README ou commentaire).

Non-Objectifs (hors scope initial):
- Cache intelligent multi-commit.
- Détection transitive fine via graphe d'import.
- Parallélisation (une version séquentielle suffit d'abord).

Priorité: Medium – Gains de productivité pour chaque itération core.

Prochaine étape: implémenter script initial puis marquer progression (% facultatif) dans message de commit.

---
Processus minimal pour ajouter une nouvelle dette :
1. Ajouter ligne dans le tableau ci-dessus avec ID suivant (TD-008 ...). 
2. Définir un Exit Criteria mesurable.
3. Une fois terminée, supprimer complètement la ligne et (si besoin) déplacer la description longue dans `TECH-DEBT-ARCHIVE.md` (sinon juste Git).

Fin du fichier.

