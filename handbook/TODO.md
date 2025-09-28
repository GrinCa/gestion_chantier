# Roadmap Technique (Transition Lite → Solide)

## 1. Terminologie & Dépréciations (CONCLU)
- [x] Ajouter JSDoc `@deprecated` sur les méthodes wrappers Project (createProject, getProject, getUserProjects)
- [x] Ajouter JSDoc `@deprecated` sur les hooks alias (`useProjects`, `useProject`, `useProjectData`, mobile équivalents)
- [x] Introduction du champ canonical `workspace_id` dans le core (types + DataEngine) avec miroir `project_id` legacy
- [x] Mise à jour doc mobile (table migration Project → Workspace)
- [x] Base de compat (queryData accepte workspace_id ou project_id)
Résumé: Migration terminologie stabilisée (toutes les actions prévues pour cette section sont faites). Les étapes destructives finales (suppression wrappers / champ `project_id`, docs root & web) sont entièrement tracées dans Section 12 et n'appartiennent plus à cette section. Section 1 est **définitivement close**.

## 2. Persistence & Repository (CONCLU Phase 1)
- [x] Étendre `SQLiteResourceRepository` : filtres (owner, type, updated_at range)
- [x] Ajouter pagination simple (limit + offset) puis évolution vers curseur
	- [x] Ajouter index SQL (owner, type, updated_at)
	- [x] Préparer future FTS (schema + table virtuelle, plan de migration) – table `resources_fts` créée best-effort (sans requêtage encore)
	- [x] Script de validation migration (meta + indices) via `sqlite-migration-selftest` (incrémente check schema_version>=2). Les migrations incrémentales futures (schema_version >2) seront suivies dans une future Section dédiée (ex: Section FTS avancé / migrations).
	- [x] Meta `schema_version` stockée dans table `__meta` (actuelle = 2)

Résumé Section 2: Base de persistance stable (schema v2), indices critiques en place, FTS pré-initialisé, self-test de conformité ajouté. Prochaines évolutions (migrations incrémentales, FTS avancé, curseur, compression) seront traitées dans les sections Index/FTS (Section 5) et TECH-DEBT (TD-002) pour garder cette section clôturée.

## 3. Conflits & Concurrency
- [x] Ajouter champ `version` incrémental aux Resources (déjà présent, validé)
- [x] Refuser update si version divergente (émettre event `resource.conflict`)
- [x] Exposer `conflicts` dans `syncStatus`
- [x] Ajouter script self-test conflits (`handbook/scripts/conflict-selftest.ts`)

## 4. Auth & Access Policy
- [x] Étendre `AccessPolicy` pour supporter rôles (owner, editor, reader)
- [x] Ajouter vérification par action (create/update/delete/export/migration/tool)
- [x] Émettre event `access.denied` (via InstrumentedAccessPolicy)
- [x] Mettre en place tests d’accès (role-based + denied instrumentation)
	- [x] Intégrer métriques futures sur refus (Section 7 Observabilité) → metrics.accessDenied implémenté

## 5. Index & Recherche
- [x] Ajouter scoring simple (compte occurrences champ texte) + exposition `scores` (InMemory + fallback SQLite, FTS garde score futur dédié)
- [x] API query enrichie: `fullText`, `limit`, `cursor` (nextCursor implémenté + tri par défaut stable)
- [x] Rebuilder index à partir du repository (script `reindex-selftest`) – méthode `rebuildFullTextIndex()` + self-test

Section 5 CONCLU (phase actuelle). Améliorations futures (highlight, FTS avancé, ranking BM25) → TD-002.

## 6. Export & Sauvegarde (CONCLU)
- [x] Ajouter manifest export (metadata.json : date, count, types, version)
- [x] Export chunked (fichiers rotatifs après N lignes) via `exportWorkspaceChunked`
- [x] Export incrémental (since timestamp) via `exportWorkspaceIncremental`
- [x] Validation de ré-import (ImportService validateNdjson / validateChunked)
	- [x] Séparation surface ExportService browser/node (stub navigateur)

Résumé: Pipeline export complet (simple, chunked, incremental) + validation structurée (count, types, duplicates, JSON). Prochaines évolutions futures (hash par chunk, signature, reprise partielle) pourront passer en dettes ou Section Observabilité.

## 7. Observabilité (CONCLU Phase 1)
- [x] Ajouter latence moyenne repository (wrap CRUD timed) -> `InstrumentedResourceRepository` + metrics.repository.ops
- [x] Compteur accès refusés (access.denied) -> `InstrumentedAccessPolicy` + metrics.accessDenied
- [x] Compteurs export (full / manifest / chunked / incremental) + durée + volume -> metrics.export
- [x] Health enrichi (repositoryLatency, exports, accessDenied exposés) -> `HealthService.snapshot()`
- [x] Test dédié `metrics-observability.test.ts`

Phase 2 (CONCLU hors optionnel):
- [x] Import metrics (durée, resources, erreurs) + recordImport (MetricsService + HealthService.imports)
- [x] Hook MigrationService: compteur migrations exécutées + latence (recordMigration)
- [x] Ajouter recordMigration dans MetricsService + exposition health
- [x] Erreurs EventBus (compteur exceptions handlers) -> wrapper bus.emit try/catch + metrics.eventErrors
- [x] Endpoint CLI/HTTP `/health` & `/metrics` (implémentation server via `/_obs/health` & `/_obs/metrics` + TODO alias direct)
- [ ] Histogrammes (buckets) optionnels / p50/p99 (différé – faible priorité)

Résumé: Phase 1 + Phase 2 (hors option p50/p99) livrées : repo latency, exports, imports, migrations, accessDenied, eventErrors, endpoints `/ _obs /metrics` & `/ _obs /health`. Reste uniquement l'amélioration facultative (histogrammes ou percentiles supplémentaires). Section 7 peut être traitée comme close fonctionnellement.

## 8. Nettoyage Legacy (CONCLU)
- [x] Wrapper compat `wrapDataEngineWorkspaceCompat` (écriture single `workspace:` + fallback lecture `project:` + miroir auto)
- [x] Export module + intégration `createWebDataEngine`
- [x] Ajout dual-field dans hooks (`workspace_id` + `project_id` transitoire)
- [x] Test unitaire `workspace-key-compat.test.ts` (compte fallback + miroir)
- [x] Ajustement DataEngine: support workspace_id prioritaire + message d'erreur explicite
- [x] Mise à jour TODO & documentation interne (plan retrait)
- [ ] (Différé Section 12) Retrait final wrappers / suppression champ `project_id`

Résumé Section 8: Phase de compatibilité clé terminée. Aucune écriture nouvelle sous préfixe `project:`. Les lectures legacy sont comptées et miroir vers `workspace:`. La suppression définitive (breaking) sera orchestrée en Section 12.

## 9. DevX & Sécurité (EN COURS)
- [x] ESLint rule custom (flat config) détectant usage `createProject` / `getProject` / `getUserProjects` hors core
- [x] Mode strict runtime (`CORE_STRICT_MODE` via env GC_CORE_STRICT=1) : wrappers dépréciés lèvent des erreurs
- [ ] Vérification taille export avant création (limite configurable)
- [x] Script guard: échouer si dossier `archi/` réapparaît (lint CI) (post-nettoyage 2025-09-28)

Notes: Une fois la limite export ajoutée, Section 9 pourra être marquée close. Possibles améliorations futures : rule ESLint séparée en plugin dédié, reporting métrique sur violations strict mode.

## 10. Tests & Qualité
- [x] Initial test suite (repository, dual export, sqlite stub, export stub, access policy)
- [ ] Ajout test unitaire sur MigrationService (cas: aucune migration, échec, dépendance)
- [ ] Test intégration Export + Reindex + Migration enchaînés
- [ ] Test chargement massif (1000 resources) métriques index
	- [ ] Couverture sur Indexer scoring futur

## 11. Monorepo Extensions (Nouveaux Chantiers)
- [ ] Script `changed-selftests.mjs` (analyse git diff → liste self-tests à exécuter)
- [ ] Hook pre-commit (optionnel) lançant mapping minimal
- [ ] Self-test serveur minimal (`packages/server/scripts/server-selftest.ts`) ping + CRUD user
- [ ] Smoke test web (`packages/web/src/__selftests__/app-smoke.test.tsx`) – rend App sans crash
- [ ] Smoke test mobile (`packages/mobile/src/__selftests__/app-smoke.test.tsx`) – logique basique (pas besoin appareil)
- [ ] Event taxonomy selftest (collecte events émis vs ARCHITECTURE.md)
- [ ] Manifest consistency check (scanner fichiers principaux vs MANIFEST.json)
- [ ] Ajout hash SHA256 dans export manifest (manifest v2)
- [ ] Métriques latence repository (wrap + metrics-selftest extension)
- [ ] OpenAPI (ou doc minimal) pour endpoints server (futur swagger)
- [ ] ESLint rule usage wrappers dépréciés (createProject etc.)
- [ ] Ajout check CI anti-réintroduction dossier legacy `archi/` (double avec script guard)


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

---
## Dettes (référence croisée TECH-DEBT.md)
- TD-001 Node/browser split (DONE)
- TD-002 FTS avancé (OR/phrase/highlight)
- TD-003 Auto labels PR
- TD-004 Metrics latence repo
- TD-005 Gate lint/tests (partiellement amorcé: tests OK, lint manquant)

## 12. Migration Workspace (Phase 2+)
- [ ] Web: Mettre à jour hooks (`useDataEngine`, `useCalculatrice`) pour accepter `workspaceId` prop & émettre warning si `projectId` utilisé
- [ ] Web: Remplacer partout les objets query `{ project_id: ... }` par `{ workspace_id: ... }` (garder mapping interne si server encore /projects)
- [ ] Mobile: Mettre à jour `useMobileDataEngine` & écrans (CalculatriceScreen) pour paramètre `workspaceId` + alias deprecated
- [ ] Server: Introduire endpoints `/workspaces/*` parallèles aux `/projects/*` (ou redirection interne) + réponse incluant `workspace_id`
- [ ] Core: Ajouter test unitaire `queryData({ workspace_id })` (sans project_id) pour garantir support complet
- [ ] Script audit: scanner repo pour usages restants de `project_id` hors compat (exclusion dist/ & TODO)
- [ ] Docs: Mettre à jour README root + README web avec table migration & note de dépréciation finale
- [ ] LLM-ENTRYPOINT / ARCHITECTURE: retirer mention de dual naming une fois UI & server migrés
- [ ] Retirer generation miroir `project_id` dans `createData` (n'écrire plus que `workspace_id`)
- [ ] Supprimer wrappers createProject/getProject/getUserProjects (coordonné avec Section 8 Nettoyage Legacy)
- [ ] Supprimer champ `project_id` des types (breaking change majeure) + changelog
- [ ] Ajouter test négatif: importer données ne contenant que `project_id` → migration automatique ou erreur contrôlée

Notes Migration:
- Stratégie safe: d'abord lecture double, puis écriture simple (`workspace_id`), enfin retrait wrappers.
- Le script audit déclencheur pour planifier le commit de suppression finale.

## Incidents / Bugs Temporaires
- (vide) – reporter ici avant création issue externe.

