# Roadmap Technique (Transition Lite → Solide)

## 1. Terminologie & Dépréciations
- [x] Ajouter JSDoc `@deprecated` sur les méthodes wrappers Project (createProject, getProject, getUserProjects)
- [x] Ajouter JSDoc `@deprecated` sur les hooks alias (`useProjects`, `useProject`, `useProjectData`, mobile équivalents)
- [ ] Remplacer progressivement `project_id` dans les types/query par `workspace_id` (avec compat layer de lecture)
- [~] Mettre à jour toutes les docs (mobile README fait, reste README root + web) avec la table de migration Project → Workspace

## 2. Persistence & Repository
- [x] Étendre `SQLiteResourceRepository` : filtres (owner, type, updated_at range)
- [x] Ajouter pagination simple (limit + offset) puis évolution vers curseur
- [ ] Ajouter index SQL (owner, type, updated_at)
- [ ] Préparer future FTS (schema + table virtuelle, plan de migration)
- [ ] Script de migration SQL (création/upgrades) + auto-check version

## 3. Conflits & Concurrency
- [x] Ajouter champ `version` incrémental aux Resources (déjà présent, validé)
- [x] Refuser update si version divergente (émettre event `resource.conflict`)
- [x] Exposer `conflicts` dans `syncStatus`
- [x] Ajouter script self-test conflits (`archi/scripts/conflict-selftest.ts`)

## 4. Auth & Access Policy
- [ ] Étendre `AccessPolicy` pour supporter rôles (owner, editor, reader)
- [ ] Ajouter vérification par action (create/update/delete/export)
- [ ] Émettre event `access.denied` (optionnel métriques)
- [ ] Mettre en place tests d’accès

## 5. Index & Recherche
- [ ] Ajouter scoring simple (compte occurrences champ texte)
- [ ] API query enrichie: `fullText`, `limit`, `cursor`
- [ ] Rebuilder index à partir du repository (script `reindex-selftest`)

## 6. Export & Sauvegarde
- [x] Ajouter manifest export (metadata.json : date, count, types, version)
- [ ] Export chunked (fichiers rotatifs après N lignes)
- [ ] Export incrémental (since timestamp)
- [ ] Validation de ré-import (esquisse futur ImportService)

## 7. Observabilité
- [ ] Ajouter latence moyenne repository (wrap CRUD timed)
- [ ] Compteur migrations exécutées / en attente dans metrics
- [ ] Endpoint CLI/HTTP `health` détaillé (inclut version repo, index size, pending migrations, conflicts)
- [ ] Exposer metrics en JSON (future /metrics)

## 8. Nettoyage Legacy
- [ ] Remplacer toutes les chaînes `project:` storage par `workspace:` avec phase de lecture double
- [ ] Script de migration des clés (scan & rewrite)
- [ ] Retirer wrappers deprecated (milestone future v2)

## 9. DevX & Sécurité
- [ ] ESLint rule custom pour détecter usage `createProject` hors core
- [ ] Ajout d’un mode strict (feature flag) désactivant wrappers
- [ ] Vérification taille export avant création (limite configurable)

## 10. Tests & Qualité
- [ ] Ajout test unitaire sur MigrationService (cas: aucune migration, échec, dépendance)
- [ ] Test intégration Export + Reindex + Migration enchaînés
- [ ] Test chargement massif (1000 resources) métriques index

---

## Ordre d’Exécution Proposé (Vague 1)
1. (Terminologie) Dépréciations JSDoc wrappers + hooks
2. (Conflits) Version + optimistic locking minimal
3. (Persistence) Filtres & pagination basique SQLite
4. (Index) Rebuild script & scoring simple
5. (Export) Manifest JSON
6. (Observabilité) Repository timings + health enrichi

Chaque tâche : patch + self-test associé.

---

## Suivi
Cocher au fur et à mesure ; garder commits atomiques `feat(core): ...`, `chore(docs): ...`, `refactor(core): ...`.
