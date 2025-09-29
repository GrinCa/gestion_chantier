# DEPRECATION NOTICE – Replaced by LLM-ENTRYPOINT.md

Ce fichier est conservé uniquement pour compatibilité historique.
Nouvelle source unique: `handbook/LLM-ENTRYPOINT.md`.

À faire si vous tombez ici:
1. Ouvrir `LLM-ENTRYPOINT.md`.
2. Suivre le format de session défini (section 6).
3. Supprimer toute référence future à ce fichier dans la doc / scripts.

Script supprimé (TD-006 Phase A) – utiliser uniquement `LLM-ENTRYPOINT.md`.

— Mainteneur

# Session Primer (Fournir Contexte Initial au LLM)

Objectif: Disposer d'un format court et structuré que tu peux coller en tout début de session pour que le LLM soit immédiatement opérationnel sans relire toutes les docs.

## Quand l'utiliser ?
Au démarrage d'une nouvelle journée / focus ou après une longue pause. Pas nécessaire pour des échanges consécutifs rapprochés.

## Principes
1. Court avant tout (<= 30 lignes idéalement).
2. Un seul objectif principal + éventuellement 1–2 secondaires.
3. Rappeler l'état build & branche pour éviter actions basées sur des hypothèses périmées.
4. Extraire seulement 3–5 items TODO réellement ciblés (pas toute la liste).
5. Inclure la dette / incident prioritaire (ID depuis TECH-DEBT / KNOWN-ISSUES).

## Format Minimal Recommandé
```
Session:
  Objectif principal: <phrase courte>
  Objectifs secondaires: <optionnel>
  Branche: <nom> (own fork? divergence?)
  Commit HEAD: <short-sha>
  Build: OK | FAIL (<erreur clé> )
  Tests: (non lancés) | OK | FAIL (<test clé>)
  Focus Debt/Issue: TD-001 (Node/browser split) ; KI-001
  Tâches ciblées:
    1. ...
    2. ...
    3. ... (optionnel)
  Contraintes: (ex: ne pas toucher FTS) / style commit conventionnel
  Livrable 1 attendu: <ex: squelette dual bundle>
  Restitution souhaitée: patch direct + commit atomique
```

## Variante Ultra Courte (urgence)
```
Goal: TD-001 phase 1 (séparer export node/browser)
Branch: main propre @abc1234
Build: FAIL (Readable from stream)
Tasks: 1) créer dossiers node/browser 2) stub export browser 3) MAJ exports
Do not touch: FTS
Deliverable: feat(core): node/browser export skeleton
```

## Pièges à éviter
- Coller un dump complet d'erreurs (résumer au lieu: 1 ligne).
- Indiquer "fais tout" sans ordre -> toujours une liste ordonnée.
- Oublier le livrable 1 (le LLM risque de supposer une grosse refactor d'un coup).
- Mettre 15 tâches: le modèle découpera mal. Sélectionner 3 max pour la salve initiale.

## Script d'Aide (session-primer)
Ancienne section supprimée: génération automatisée désormais centralisée via `save-session.mjs` (ou future fusion Phase C TD-006).

## Mise à Jour
Si le format évolue, modifier ce fichier puis adapter le script. Toujours conserver une version minimale en tête.

---
Mainteneur: Ajuster au fur et à mesure que le nombre de packages / complexité augmente.
