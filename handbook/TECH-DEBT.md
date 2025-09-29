# Technical Debt Register

Ce fichier distingue clairement ce qui RESTE À FAIRE (OPEN) de ce qui est ACHEVÉ (DONE). Les sections détaillées (TD-XXX) restent inchangées plus bas.

## 0. Tableau de Bord Synthétique

### OPEN (à traiter)
Actuellement: 1 dette ouverte.

| ID | Catégorie | Titre | Priorité | Exit Criteria |
|----|-----------|-------|----------|---------------|
| TD-006 | Tooling | Simplifier scripts PR-centric inutilisés | Medium | Scripts PR retirés (create-pr/update-pr/apply-pr-labels), pr-check renommé local-check, handoff scripts fusionnés ou nettoyés, doc mise à jour |

### DONE (historique)
| ID | Catégorie | Titre | Priorité | Exit Criteria (atteint) |
|----|-----------|-------|----------|-------------------------|
| TD-001 | Build | Node vs Browser surface split | High | Dual bundles + guard script no forbidden modules |
| TD-002 | Search | Advanced FTS (OR, phrase, highlight) | Medium | Selftests pass + relevance doc |
| TD-003 | PR Automation | Auto label application | Low | Labels auto appliqués sur PR |
| TD-004 | Metrics | Repository latency instrumentation | Low | p50/p95 exposés Health/Metrics |
| TD-005 | Quality Gate | Lint/tests integration | Medium | local-check + lint gate baseline |

### Vue Chronologique (résumé)
- TD-005 → Gate lint baseline no‑regression.
- TD-004 → Latences p50/p95 repo & tool.
- TD-003 → Auto-label PR.
- TD-002 → FTS avancé (OR / phrase / highlight / accents).
- TD-001 → Split Node vs Browser.

---

---
## Processus & Conventions

États:
| État | Rôle | Entrée | Sortie |
|------|------|--------|--------|
| OPEN | Définie & priorisée | Ajout Dashboard | Dev démarre → ACTIVE |
| ACTIVE | En cours | 1er commit | Exit Criteria atteints → COOLDOWN |
| COOLDOWN | Récemment DONE | Passage ACTIVE | Archive (14j ou >5 cooldown) |
| ARCHIVED | Historique | Script / manuel | Jamais modifiée |

Ajout nouvelle dette:
1. Ajouter ligne dans OPEN.
2. Définir Exit Criteria clair + priorité.
3. Lors du premier commit → déplacer en ACTIVE (indiquer progression % dans commit si besoin).

Archivage:
```
node scripts/debt-maintain.mjs --archive-stale
```

Historique détaillé: voir `TECH-DEBT-ARCHIVE.md` (TD-001 → TD-005 déjà déplacées).

Scripts prévus:
- `--list` (dashboard console)
- `--archive-stale` (déplacer COOLDOWN expirées)
- `--new` (génération stub TD-XXX)

Politique LLM: Charger uniquement ce fichier pour l’état courant; ouvrir archive seulement si une ancienne TD est requise.

---
Document minimisé pour rester léger (<10KB). Détails historiques → fichier d'archive.

---
## TD-006 Simplifier scripts PR-centric inutilisés (OPEN)
Contexte:
Le répertoire `scripts/` contient plusieurs scripts conçus pour un flux GitHub Pull Request (create-pr, update-pr, apply-pr-labels) et des scripts de passation redondants (session-primer vs prepare-handoff vs save-session). Le flux actuel n'utilise pas les PR ni l'auto-labelling → surcharge cognitive et bruit.

Objectifs:
- Réduire le set de scripts au strict nécessaire pour le travail local + dette.
- Éviter confusion pour un nouvel agent (scripts non pertinents).
- Garder un point d'entrée unique pour handoff / session.

Surface actuelle:
| Script | Rôle actuel | Pertinence | Action proposée |
|--------|-------------|------------|-----------------|
| create-pr.mjs | Ouvre une PR via API (supposé) | Faible | Supprimer |
| update-pr.mjs | Mets à jour description/labels | Faible | Supprimer |
| apply-pr-labels.mjs | Applique labels PR (TD-003) | Faible | Supprimer (archivé via TD-003) |
| local-check.mjs (ex pr-check) | Pipeline lint → build → tests | Moyenne | (Renommage effectué) |
| lint-gate.mjs | Lint baseline no-regression | Haute | Conserver |
| debt-maintain.mjs | Gestion lifecycle dettes | Haute | Étendre (implémenter --new / --archive-stale) |
| prepare-handoff.mjs | Génère bloc handoff brut | Moyenne | Fusionner logique dans save-session |
| save-session.mjs | Autosave + handoff + snippet | Haute | Conserver (intégrer prepare-handoff) |
| session-primer.mjs | Ancien primer (déprécié) | Nulle | Supprimer |

Plan Remédiation (phases):
1. Phase A (Nettoyage): Supprimer scripts PR + session-primer. ✔
2. Phase B (Renommage): pr-check → local-check (docs + scripts). ✔
3. Phase C (Fusion): Intégrer génération handoff de `prepare-handoff.mjs` dans `save-session.mjs` (option `--raw`) puis supprimer `prepare-handoff.mjs`.
4. Phase D (Étendre debt-maintain): Implémenter `--new` (scaffold TD-XXX) et `--archive-stale` (cooldown >14j).

Exit Criteria (détaillé):
- (Phase A) create-pr.mjs, update-pr.mjs, apply-pr-labels.mjs, session-primer.mjs supprimés. ✔
- (Phase B) pr-check.mjs remplacé par local-check.mjs (scripts npm mis à jour). ✔
- (Phase C) prepare-handoff.mjs supprimé, fonctionnalité accessible via `node scripts/save-session.mjs --raw`.
- (Phase D) debt-maintain fournit `--list --new --archive-stale` opérationnels.
- README / GIT-WORKFLOW / LLM-ENTRYPOINT ne mentionnent plus scripts retirés (en cours au fil des phases).

Notes:
- TD-003 (auto-label) reste archivée; suppression des artefacts ne remet pas en cause l'historique.
- Garder commit séparé par phase pour lisibilité.

Priorité: Medium (réduction dette cognitive), peut précéder toute nouvelle fonctionnalité majeure.

