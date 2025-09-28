# Git Workflow & Branching Strategy

## Objectifs
- Historique clair et réversible.
- Branches petites, thèmes atomiques.
- Self-tests obligatoires avant merge.
- Traçabilité documentation ↔ code ↔ tests.

## Types de Branches
| Type | Préfixe | Usage | Durée de vie |
|------|---------|-------|--------------|
| Feature | feat/ | Nouvelle capacité (ex: `feat/fts-query`) | Court (1–3 jours) |
| Fix | fix/ | Correction bug ciblé | Court |
| Chore | chore/ | Maintenance (deps, scripts) | Court |
| Docs | docs/ | Documentation pure | Court |
| Refactor | refactor/ | Changement interne sans impact fonctionnel | Court |
| Spike | spike/ | Exploration jetable (jamais merge sans cleanup) | Jetable |

## Convention de Commit
```
<type>(<scope>): <résumé>

[description optionnelle]
```
Types permis: feat, fix, chore, docs, refactor, test, perf, build, ci.

Règles:
- 1 commit = 1 intention claire.
- Ajouter self-test associé quand feature ou migration.
- Pas de "fix after review" multiples: squash avant merge.

## Processus Feature Standard
1. Créer branche: `git checkout -b feat/nom-clair` depuis `main` à jour.
2. Implémenter + ajouter self-test (ou étendre un existant).
3. `npm run selftest:all --workspace=packages/core` (ou ciblé via futur changed-selftests).
4. Mettre à jour `archi/TEST-MATRIX.md` et/ou `archi/TODO.md` si surface couverte change.
5. Commit atomique.
6. Push + PR (review rapide: <400 lignes diff ideal).
7. Rebase sur main si plus de 2 jours passent / conflits apparaissent.
8. Merge (fast-forward ou squash selon taille).

## Politique de Merge
| Cas | Méthode |
|-----|---------|
| Petit lot (<=3 commits propres) | Fast-forward |
| Gros lot hétérogène | Squash & merge (résumé clair) |
| Série dépendante & historique utile | FF en gardant commits |

Jamais de merge commit non nécessaire (éviter graph bruité).

## Rebase Guidelines
- Rebase interactif pour nettoyer avant PR si bruit (rename, fix lint...).
- Ne pas réécrire l'historique déjà publié si autre branche en dépend.

## Tagging & Releases
- Tag technique jalon: `v0.x.0-lite-foundation` etc.
- Tag après passage stable test suite verte.
- Changelog synthétique (auto possible plus tard) + mapping features principales.

## Bases de Données & Fichiers Volatils
- Ne jamais versionner fichiers runtime (`*.db`, caches). Fournir template (`*.template.db`).
- Ajouter règle .gitignore correspondante.

## Self-Tests & Couverture
- Chaque nouvelle surface => ligne dans `TEST-MATRIX.md`.
- Migration => self-test spécifique.
- Reindex/opérations lourdes => self-test dédié.

## Branches Longue Durée (À éviter)
- Si besoin (ex: refonte massive), découper en feature branches mergées régulièrement.

## Gestion Conflits
- Préparer rebase tôt (avant >5 commits divergence).
- Conflit persistant => isoler commit de résolution clair (`chore(resolve-conflict): ...`).

## Outils Futurs
- Script `changed-selftests` pour déterminer sous-ensemble de scripts à exécuter.
- Hook pré-commit (lint + subset tests).

## Check Final Avant Merge
Checklist rapide:
- [ ] Tests ✅
- [ ] Docs (TODO / TEST-MATRIX) à jour
- [ ] Pas de fichiers runtime accidentels
- [ ] Commit messages conformes
- [ ] Rebase sur main récent

## Exemples de Bon Commit
```
feat(core): add full-text MATCH query path with scoring

docs(archi): update TEST-MATRIX for fts query coverage
```

## Anti-Patterns
- Commit fourre-tout (>1000 lignes diverses).
- Branch qui traîne >1 semaine sans rebase.
- Ajout code sans self-test associé (quand testable).
- Fichier build/dist versionné.

---
Ce fichier évoluera avec l’outillage (scripts automation, metrics sur temps de review, etc.).
