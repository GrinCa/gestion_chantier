## Handbook (Simplifié)

But: réduire la charge cognitive. Trois zones seulement à consulter au quotidien.

| Fichier | Rôle | Fréquence |
|---------|------|-----------|
| `TASKS.md` | Vue unique : Now / Next / Backlog + Dettes ouvertes | Quotidien |
| `DECISIONS.md` | Décisions d'architecture figées (ADR light) | Consultation ponctuelle |
| `TECH-DEBT.md` | Registre détaillé (historique + process) | Quand on crée / ferme une dette |

Archives lourdes: voir `TECH-DEBT-ARCHIVE.md` uniquement si nécessaire.

Ajouts rapides:
1. Ajouter une tâche → éditer bloc `# Now` (si actionnable sous 1-2 jours) sinon `# Backlog`.
2. Ajouter une dette → compléter tableau OPEN dans `TECH-DEBT.md` puis refléter la ligne courte dans la section "Dettes Ouvertes" de `TASKS.md`.

Scripts utiles (à venir):
```
node scripts/tasks-report.mjs   # affichage console condensé (future impl.)
```

Règles UX:
* Pas de duplication longue entre fichiers : `TASKS.md` = synthèse, jamais de détails techniques longs.
* 1 écran maximum pour `TASKS.md` (viser < 120 lignes).
* Quand une dette passe DONE → mettre à jour `TECH-DEBT.md` puis enlever de la section "Dettes Ouvertes" dans `TASKS.md`.

---
Dernière réorg: Fusion TODO + Dettes ouvertes (2025-09-29).
