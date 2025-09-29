# Technical Debt Register

Ce fichier distingue clairement ce qui RESTE À FAIRE (OPEN) de ce qui est ACHEVÉ (DONE). Les sections détaillées (TD-XXX) restent inchangées plus bas.

## 0. Tableau de Bord Synthétique

### OPEN (à traiter)
Actuellement: (aucune dette ouverte listée ici – ajouter nouvelle entrée ci-dessous si nécessaire)

| ID | Catégorie | Titre | Priorité | Exit Criteria |
|----|-----------|-------|----------|---------------|
| (vide) |  |  |  |  |

### DONE (historique)
| ID | Catégorie | Titre | Priorité | Exit Criteria (atteint) |
|----|-----------|-------|----------|-------------------------|
| TD-001 | Build | Node vs Browser surface split | High | Dual bundles + guard script no forbidden modules |
| TD-002 | Search | Advanced FTS (OR, phrase, highlight) | Medium | Selftests pass + relevance doc |
| TD-003 | PR Automation | Auto label application | Low | Labels auto appliqués sur PR |
| TD-004 | Metrics | Repository latency instrumentation | Low | p50/p95 exposés Health/Metrics |
| TD-005 | Quality Gate | Lint/tests integration | Medium | pr-check + lint gate baseline |

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
