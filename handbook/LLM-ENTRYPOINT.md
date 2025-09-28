# LLM ENTRYPOINT (Point d'Ancrage Unique pour Chaque Nouvelle Session)

Ce fichier est la SEULE source à coller / condenser au démarrage d'une nouvelle session LLM. Il remplace `SESSION-PRIMER.md` et le script `session-primer.mjs` (dépréciés). Objectif: contexte suffisant pour agir immédiatement sans relecture intégrale du handbook.

---
## 1. Vision Courte du Projet
Base modulaire orientée services (EventBus, ResourceService avec locking optimiste, MigrationService, Metrics, Health, Export NDJSON, Index/FTS initial). Focus actuel: stabiliser socle + clarifier docs avant fonctionnalités avancées. Front build échoue encore (import Node côté navigateur).

## 2. État Technique Synthétique
- Branche active: (mets ici après `git rev-parse --abbrev-ref HEAD`)
- HEAD: (short SHA)
- Build Web: FAIL (KI-001 Readable/stream leak) / ou OK si corrigé
- Tests: (non lancés | OK | FAIL <résumé>)
- FTS: Basique (AND multi-termes + heuristique). Améliorations (OR, phrase, highlight) différées.

## 3. Dette & Incidents Prioritaires
| ID | Type | Résumé | Statut |
|----|------|--------|--------|
| TD-001 | Debt | Séparer surface export Node vs Browser | open |
| KI-001 | Issue | Bundle web casse: dépendances Node importées | open |

Toujours référencer ID exact dans les commits / prompts.

## 4. Objectif de la Salve Courante (À REMPLIR)
Objectif principal: <phrase courte orientée livrable>
Objectifs secondaires: <optionnel 0–2>
Livrable 1 attendu: <ex: squelette exports dual>
Contraintes: <ex: ne pas toucher FTS / conserver API publique>

## 5. Tâches Ciblées (Max 3 Pour Démarrer)
1. <...>
2. <...>
3. <optionnel>

Si plus de 3 tâches sont nécessaires, demander plan de phase suivante après commit du livrable 1.

## 6. Format Résumé à Coller dans le Premier Prompt
```
Session:
  Goal: <objectif principal>
  Branch: <nom> @ <sha>
  Build: <OK|FAIL + cause courte>
  Tests: <non lancés|OK|FAIL + 1 test>
  Focus: TD-001 ; KI-001
  Tasks:
    1. ...
    2. ...
    3. ...
  Deliverable: <livrable 1>
  Constraints: <...>
  Output style: patch + commit atomique
```

Variante ultra courte (urgence):
```
Goal TD-001 phase 1; Build FAIL (Readable stream); Tasks: 1) structurer dossiers 2) stub export browser 3) MAJ barrel; Deliverable: feat(core): node/browser skeleton
```

## 7. Règles d'Interaction Souhaitées avec le LLM
- Toujours proposer patch concret (pas seulement description) si action faisable.
- Si incertitude sur un choix structurel -> proposer 2 options condensées (<5 lignes chacune) + recommandation.
- Limiter modifications par commit à un axe logique (atomicité).
- Refuser d'étendre portée si livrable 1 non complété.

## 8. Style de Commit
Format: `feat|fix|refactor|docs|chore(scope): résumé bref`
Inclure IDs de dette/issue si pertinent. Ex: `feat(core): split node/browser surface (TD-001, KI-001)`

## 9. Edge Cases à Garder en Tête
- Risque d'importer modules Node (`stream`, `fs`) côté navigateur -> isoler adaptateurs.
- Migrations: ne jamais muter fichiers existants de migration; toujours en ajouter un nouveau.
- Export NDJSON: garder flux paresseux (pas d'accumulation mémoire).

## 10. Prochain Grand Incrément (Contexte Futur, Ne Pas Agir Sans Demande)
- Avancées FTS: OR, phrase search, highlight.
- Metrics latence par service.
- Gate élargi: lint + tests.

## 11. Quand Mettre à Jour Ce Fichier ?
Uniquement quand un pattern durable change (architecture, workflow, dette prioritaire). Ne pas y injecter des erreurs éphémères (elles vivent dans KNOWN-ISSUES jusqu'à résolution).

## 12. Dépréciations
- Ancien: `SESSION-PRIMER.md` (maintenant simple pointeur)
- Script: `scripts/session-primer.mjs` (gardé transitoirement -> suppression future quand plus utilisé)

---
Mainteneur: Minimiser la taille; viser < 120 lignes stables.
