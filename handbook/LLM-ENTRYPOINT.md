# LLM ENTRYPOINT (Point d'Ancrage Unique pour Chaque Nouvelle Session)

> Section 0 ajoutée: passation express pour qu'un nouvel agent récupère seul l'état courant avant d'agir.

## 0. Passation Express (Ce que le LLM doit faire AVANT toute proposition)
Checklist impérative, aucune modification tant que chaque point n'a pas une réponse synthétique:

1. Git Context:
   - Lire branche: `git rev-parse --abbrev-ref HEAD`
   - Lire SHA court: `git rev-parse --short HEAD`
   - Vérifier diff en cours: `git status -s` (si modifications → demander clarification avant d'écrire autre chose)
2. Santé Build (optionnel si coût): tenter `npm run build` (ou signaler "non vérifié" si trop long).
3. Debt / Issues Focus: ouvrir `handbook/TECH-DEBT.md` & `handbook/KNOWN-ISSUES.md` → relever IDs en statut OPEN/ACCEPTED prioritaire (TD-001 / KI-001).
4. Tâches Actives: dans `handbook/TODO.md` récupérer les 3 premières cases non cochées pertinentes pour le domaine ciblé (ignorer sections non liées si hors scope).
5. Derniers Commits: récupérer les 2 derniers messages (`git log -2 --oneline`) pour voir le contexte immédiat (ex: nettoyage, refactor, feature en cours).
6. Vérification Surface: confirmer si objectif demandé par l'utilisateur correspond bien à la priorité actuelle (sinon proposer réalignement).
7. Préparer un BLOC RÉSUMÉ (≤ 15 lignes) incluant: branche, sha, build (OK/FAIL/UNK + 3 mots), focus (TD/KI), tâches 1–3, deliverable suggéré, risques.
8. Attendre validation humaine si le deliverable diffère de la priorité attendue (ex: l'utilisateur voulait TD-001 mais tâches détectées autre chose).

Format cible du BLOC RÉSUMÉ généré automatiquement:
```
Context:
  Branch: <nom> @ <sha>
  Build: <OK|FAIL|UNK> (<cause courte>)
  Focus: TD-001, KI-001
  LastCommits: <c1>, <c2>
  Tasks:
    1. <...>
    2. <...>
    3. <...>
  ProposedDeliverable: <feat|refactor(...): ...>
  Risks: <1 ligne>
  NextAction: proposer patch tâche 1 uniquement
```

Si un de ces éléments ne peut être obtenu, indiquer `UNK` au lieu d'inventer.


Ce fichier est la SEULE source à coller / condenser au démarrage d'une nouvelle session LLM. Il remplace `SESSION-PRIMER.md` et le script `session-primer.mjs` (dépréciés). Objectif: contexte suffisant pour agir immédiatement sans relecture intégrale du handbook.

---
## 1. Vision Courte du Projet
Base modulaire orientée services (EventBus, ResourceService avec locking optimiste, MigrationService, Metrics, Health, Export NDJSON, Index/FTS initial). Focus actuel: stabiliser socle + clarifier docs avant fonctionnalités avancées. Front build échoue encore (import Node côté navigateur).

## 2. État Technique Synthétique
- Branche active: (mets ici après `git rev-parse --abbrev-ref HEAD`)
- HEAD: (short SHA)
- Build Web: FAIL (KI-001 Readable/stream leak) / ou OK si corrigé
- Tests: (non lancés | OK | FAIL <résumé>)
- FTS: Avancé (AND implicite + OR explicite + phrases + highlight mémoire). Limites restantes: pas de BM25, pas de proximity, pas de snippet contextuel.

## 3. Dette & Incidents Prioritaires
| ID | Type | Résumé | Statut |
|----|------|--------|--------|
| TD-001 | Debt | Séparer surface export Node vs Browser | open |
| KI-001 | Issue | Bundle web casse: dépendances Node importées | open |
| TD-004 | Debt | Metrics repository latency instrumentation | planned |
| TD-005 | Debt | Gate lint + tests intégrés | open |

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
- Metrics latence repository & services (TD-004)
- Gate élargi: lint + tests (TD-005)
- Scoring recherche avancé (BM25) & proximity (future TD)

## 11. Quand Mettre à Jour Ce Fichier ?
Uniquement quand un pattern durable change (architecture, workflow, dette prioritaire). Ne pas y injecter des erreurs éphémères (elles vivent dans KNOWN-ISSUES jusqu'à résolution).

## 12. Dépréciations
- Ancien: `SESSION-PRIMER.md` (pointeur conservé)
- Script: `scripts/session-primer.mjs` (supprimé)

## 13. Fin de Session (Préparer la Reprise)
Avant de quitter une session active, générer un bloc de handoff:
Option manuelle (fine):
  1. `node scripts/prepare-handoff.mjs`
  2. Compléter ProposedDeliverable + Risks.
  3. Vérifier `git status -s` (doit être propre après le commit handoff).
  4. `git push origin <branch>` (OBLIGATOIRE avant de quitter) – sinon le prochain agent ne verra pas les changements.
  5. Coller le bloc final dans le dernier message.

Option automatisée (recommandée):
  1. `node scripts/save-session.mjs`
     - Commit autosave si changes
     - Génère handoff + suggestion deliverable (TD-001)
     - Produit snippet démarrage prochaine session
     - Écrit `handbook/LAST-HANDOFF.md`
  2. `git push origin <branch>` (si le script a committé)
  3. Copier le snippet "NEXT SESSION" dans le dernier message.

Note: Ancien fichier `HANDFOFF.md` supprimé (intégré ici le 2025-09-28) pour éviter duplication.

Format produit exemple:
```
Handoff:
  GeneratedAt: 2025-09-28T17:42:11.123Z
  Branch: main @ a1b2c3d
  Dirty: NO
  Focus: TD-001, KI-001
  LastCommits:
    - d0f1133 docs(entrypoint): add passation express section for new LLM sessions
    - aa50f47 docs(todo): add archi folder guard tasks
  NextTasks:
    1. ...
    2. ...
    3. ...
  ProposedDeliverable: feat(core): node/browser export skeleton (TD-001, KI-001)
  Risks: fuite import Node dans bundle web

Rappel impératif: Aucun handoff n'est valide tant que le dernier commit local n'est pas poussé.
```
La prochaine session commence en appliquant la Checklist 0 puis en validant que ce bloc est encore cohérent (sinon le régénérer).

---
Mainteneur: Minimiser la taille; viser < 120 lignes stables.
