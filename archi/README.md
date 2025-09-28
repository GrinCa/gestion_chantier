# Architecture / Handoff Artifacts

This folder contains meta-architecture, governance and self-test artifacts enabling future contributors (human or LLM) to rapidly understand, verify and extend the system.

## Files

- ARCHITECTURE.md – Layer model, flows, event taxonomy, principles.
- GLOSSARY.md – Canonical domain & technical terms (Workspace alias etc.).
- CONTRIBUTING-LLM.md – Interaction & safety rules for autonomous / assisted changes.
- DECISIONS.md – ADR log (append here, never rewrite history; add supersedes notes).
- TEST-MATRIX.md – High level map of what is / isn’t tested yet.
- HANDFOFF.md – Quick onboarding workflow, daily checklist, escalation paths.
- MANIFEST.json – Machine-friendly module inventory for tooling / static analysis.
- scripts/conflict-selftest.ts – Minimal runnable optimistic-locking assertion.

## Quick Start Validation

1. Run the conflict self-test (should print PASS):
   - ts-node archi/scripts/conflict-selftest.ts
2. Inspect MANIFEST.json if adding / renaming modules; keep name + file stable.
3. When adding a service: update MANIFEST.json + ARCHITECTURE.md + maybe GLOSSARY.md.
4. Record any non-trivial design choice in DECISIONS.md (new ADR section at top).

## Automation Ideas (Future)

- Generate MANIFEST.json from code via static scan.
- Lint to ensure every emitted event appears in ARCHITECTURE.md taxonomy.
- Self-test suite aggregator (conflict, migrations, export) for CI smoke.

## Governance Principles

- Prefer additive migrations; deprecate before removal.
- Emit explicit events for all externally observable state mutations.
- Keep handoff docs current; drift > 2 PRs triggers a mandatory doc update task.

---
Maintainer note: If this folder becomes stale, prioritize updating docs before adding new runtime features. Fresh comprehension reduces future refactor cost.

---
## File Responsibility & Placement Guide (Avant renommage du dossier)

But: Éviter que des contenus se retrouvent dans le mauvais fichier. Si une info existe au mauvais endroit, suivre la procédure de relocalisation ci‑dessous.

### Tableau de Référence Rapide
| Fichier | Contenu autorisé | Ne pas mettre | Quand créer/éditer |
|---------|------------------|---------------|--------------------|
| `ARCHITECTURE.md` | Vue d’ensemble stable (couches, flux, events, principes, ancre changelog) | Bugs temporaires détaillés, discussion longue, essais | Après ajout/suppression d’un composant ou nouveau type d’événement |
| `DECISIONS.md` | ADR concis (raison, décision, conséquences) | Roadmap, backlog, how‑to | Quand une décision structurante est prise ou remplacée |
| `GLOSSARY.md` | Définitions de termes (métier + techniques) | Procédures, backlog | Lorsqu’un nouveau terme devient public / récurrent |
| `CONTRIBUTING-LLM.md` | Process contribution, workflow, normes commit/test | Vision long terme, design détaillé d’un module | Quand on change de process ou ajoute règles LLM/humain |
| `GIT-WORKFLOW.md` | Process Git (branches, rebase, merge policy) | Architecture, backlog, concepts métier | Lorsqu’on ajuste la stratégie de branches ou revue |
| `TEST-MATRIX.md` | Table couverture tests + gaps | Pas de tutoriel test, pas de roadmap générale | Après ajout/rettrait d’un test self‑test/zone |
| `TODO.md` | Roadmap technique granularité tâche (checkbox) | Décisions déjà actées, longues justifications | Quand on ajoute / termine une tâche structurée |
| `HANDFOFF.md` | Checklist onboarding rapide | Détails profonds architecture | Après changement dans le parcours d’onboarding |
| `MANIFEST.json` | Inventaire machine (modules, scripts) | Narratif, description longue | Quand un module/fichier important est ajouté/renommé |
| `scripts/*.ts` | Self-tests manuels ciblés (ex: conflit) | Code métier normal, prototypes non testés | Lorsqu’on ajoute un self-test manuel exécutable |

### Contenu Mal Placé ? Procédure de Relocalisation
1. Identifier la nature réelle du contenu (ex: décision, terme, tâche, bug temporaire).
2. Déplacer (copier-coller) le bloc vers le fichier cible approprié.
3. Dans l’ancien fichier, remplacer par une courte référence si nécessaire (ex: « Voir DECISIONS.md: 2025‑09‑28 XYZ »).
4. Commit en deux temps si possible:
   - `refactor(docs): move <bloc> from ARCHITECTURE to DECISIONS`
   - `docs(archi): cross-reference cleanup`
5. Vérifier qu’aucun doublon ne subsiste (recherche texte).

### Critères pour Savoir si ARCHITECTURE.md Doit Changer
Modifier si:
- Nouvelle couche / service / flux d’événements.
- Schéma d’événement ajouté ou modifié.
- Principes de conception ajustés.
Ne pas modifier (placer ailleurs) si:
- Bug temporaire / dette (met dans TODO ou futur fichier KNOWN-ISSUES si réintroduit).
- Longue analyse comparant 3 approches (ADR synthétique dans DECISIONS, détails éventuels dans un doc séparé).
- Liste brute de tâches (TODO.md).

### Déplacements Fréquents (Mapping)
| Mauvais emplacement courant | Destination correcte | Raison |
|-----------------------------|----------------------|--------|
| Détail bug dans ARCHITECTURE | TODO.md (ou futur KNOWN-ISSUES) | Volatil vs stable |
| Long argument technique dans TODO | DECISIONS.md | Ce n’est pas une tâche mais une justification |
| Définition terme ajoutée dans TODO | GLOSSARY.md | Centraliser vocabulaire |
| Étapes process commit dans HANDFOFF | CONTRIBUTING-LLM.md | Process unique consolidé |

### Style Recommandé par Fichier
| Fichier | Style |
|---------|-------|
| ARCHITECTURE.md | Sections numérotées, concises, stables |
| DECISIONS.md | Blocs courts (Raison / Décision / Conséquences) ordre inverse chronologique |
| TODO.md | Checkbox + phrase courte orientée action |
| GLOSSARY.md | Table term/definition, neutralité |
| CONTRIBUTING-LLM.md | Impératifs clairs, listes |
| TEST-MATRIX.md | Table + brèves notes « Gaps » |

### Validation Auto (Future Idées)
- Script lint: vérifier qu’aucun mot clé « TEMP BUG » n’apparaît dans ARCHITECTURE.md.
- Script diff: si nouvelle entrée Event dans code → exiger mise à jour Event Schema.
- Génération d’un sommaire rapide `ARCHI-SUMMARY.md` dérivé.

---
## Pré-Renommage du Dossier `archi`
Le nom `archi` s’est élargi pour inclure gouvernance, handoff, contribution. Un renommage futur clarifiera la portée.

### Options de Nom
| Candidat | Avantages | Inconvénients |
|----------|-----------|---------------|
| `docs` | Simple, classique | Trop générique si d’autres docs arrivent ailleurs |
| `meta` | Indique nature méta / gouvernance | Peu explicite pour nouveaux contributeurs |
| `platform-docs` | Précis, extensible | Plus long |
| `architecture` | Cohérent avec contenu initial | Ne reflète pas contribution / gouvernance élargies |
| `handbook` | Communauté open-source (style handbook) | Moins technique comme terme |

Recommandation: `handbook` ou `platform-docs` (clairement distinct des docs produits finaux applicatifs).

### Étapes de Renommage (Plan)
1. Choisir le nouveau nom (ex: `handbook`).
2. Renommer dossier: `git mv archi handbook`.
3. Mettre à jour références dans:
   - `pr-automation.config.json` patterns (`archi/**` → `handbook/**`).
   - Scripts PR (`scripts/create-pr.mjs`, `scripts/update-pr.mjs`).
   - Tous les `.md` internes (rechercher `archi/`).
   - README racine si référence.
4. Mettre à jour instructions dans `HANDFOFF.md` / `CONTRIBUTING-LLM.md` (chemins).
5. Commit: `chore(docs): rename archi -> handbook`.
6. Lancer recherche finale pour `archi/` — doit retourner 0 occurrences.

### Transition Temporaire
Pendant 1–2 commits, accepter références anciennes dans communications; éviter double dossier.

### Post-Renommage (Optionnel)
- Ajouter alias dans README racine: « Anciennement /archi ».
- Créer script simple `scripts/check-docs-path.mjs` qui échoue si `archi/` réapparaît.

---
## Check rapide avant Merge d’un Changement Doc
| Question | Oui = OK | Non = Action |
|----------|----------|--------------|
| Le contenu est-il dans le fichier cible correct ? | ✅ | Déplacer selon guide |
| Le style correspond-il au tableau Style ? | ✅ | Ajuster format |
| Une décision structurante a-t-elle un ADR ? | ✅ | Ajouter entrée DECISIONS.md |
| Une nouvelle tâche a été ajoutée au backlog ? | ✅ | Ajouter case TODO.md |
| Un nouvel event est émis ? | ✅ | Mettre à jour Event Schema (#15) |

---
Fin du guide de placement.
