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
4. Mettre à jour `handbook/TODO.md` si surface couverte change (TEST-MATRIX supprimé).
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
- Ajouter un self-test dédié pour chaque nouvelle surface significative.
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

## Auto-Labeling PR (TD-003)
Un workflow GitHub Actions applique automatiquement des labels aux Pull Requests selon:
- Scope fichiers modifiés → `scope:docs|scripts|server|frontend|mobile|core|web|search`
- Type (dernier commit conventionnel) → `type:feat|fix|docs|chore|refactor|test|perf|ci|build`
- Taille (additions) → `size:s|m|l|xl`
- Risque → `risk:elevated` (surface sensible) ou `risk:high` (volume > seuil config)
- Dettes / issues détectées → `debt:TD-00X`, `issue:KI-00X`

Les labels sont ajoutés de façon idempotente et créés s'ils n'existent pas. Ne retire pas les labels manuels.

But: accélérer tri des PR, filtrage revue, priorisation risques.

## Lint Gate (TD-005)
Un garde-fou lint progressif empêche toute régression tout en laissant le stock historique être résorbé progressivement.

Mécanisme:
- Fichier `.lint-baseline.json` généré (snapshot compte des violations par (fichier, règle)).
- Commande `npm run lint:gate` exécute ESLint (format JSON), agrège les counts et compare.
- Échec si un count actuel > baseline (même fichier/règle) ou si un nouveau fichier introduit des violations.
- Améliorations (counts en baisse) passent automatiquement.
- Mise à jour baseline manuelle: `node scripts/lint-gate.mjs --update` (après refactor / cleanup substantiel).

Intégration `pr-check`:
1. Lint Gate
2. Build workspaces
3. Tests core (vitest)

Variables d'environnement pour sauts ciblés (urgence):
```
PR_CHECK_SKIP_LINT=true
PR_CHECK_SKIP_BUILD=true
PR_CHECK_SKIP_TESTS=true
```
(À n'utiliser qu'en cas d'urgence ou investigation; éviter sur PR standard.)

Objectif: Prévenir augmentation dette lint tout en fournissant feedback rapide (fail rapide). La réduction du stock (1357 → 0) est incrémentale et hors scope gating.


## Check Final Avant Merge
Checklist rapide:
- [ ] Tests ✅
- [ ] Docs (TODO) à jour
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
