% Vue unifiée (TODO + Debts ouvertes)

# Now (actions immédiates)
- Section 12 (migration workspaces) – poursuivre: utilisation front complète, suppression finale legacy (planifier fenêtre breaking).
- Outil self-test ciblé (TD-007) – décider implémentation script `changed-selftests.mjs` (mapping minimal, mode --list/--run).

# Next (préparé / après Now)
- OpenAPI mini spec (endpoints clés `/workspaces`, `/users`, `/projets` déprécié, observability).
- Script tasks-report (génération console à partir de ce fichier + dettes OPEN).

# Backlog (pas encore planifié)
- Histograms supplémentaires (p50/p95/p99 exports & repo) – faible priorité.
- Final removal legacy wrappers (post workspace adoption >95%).

# Dettes Ouvertes (résumé)
| ID | Titre | Priorité | Résumé Exit |
|----|-------|----------|-------------|
| TD-007 | Self-test subset runner | Medium | Script diff → mapping tests (--since, --list, --run) |

Voir détails complets dans `TECH-DEBT.md`.

# Principes de Gestion
1. Ce fichier = synthèse courte (1 écran). Détails → autres fichiers.
2. Toute ligne doit être soit: actionnable (Now), préparée (Next), ou un parking lot (Backlog).
3. Pas d’historique ici: Git garde la trace.

# Raccourcis fréquemment utilisés
| Besoin | Où aller |
|--------|---------|
| Ajouter une dette | `TECH-DEBT.md` (table OPEN) + courte ligne ici |
| Ajouter une tâche | Ajouter à Now/Next/Backlog |
| Comprendre un choix archi | `DECISIONS.md` |
| Voir dettes anciennes | `TECH-DEBT-ARCHIVE.md` |

# À Venir (améliorations housekeeping)
- Auto génération section "Dettes Ouvertes" depuis `TECH-DEBT.md` (script).
- Lint structure (tester que `TASKS.md` < 150 lignes).
