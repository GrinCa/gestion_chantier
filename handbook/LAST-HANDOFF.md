# LAST HANDOFF

> AUTO-GÉNÉRÉ – ne pas éditer à la main. Régénérer via `node scripts/save-session.mjs`.

````
Handoff:
  GeneratedAt: 2025-09-28T17:15:16.847Z
  Branch: main @ ae319eb
  Dirty: NO
  Focus: TD-001, TD-002, TD-003, KI-001
  LastCommits:
    - ae319eb chore(session): autosave before handoff 2025-09-28-17-15-16
    - c25cd35 feat(devx): add prepare-handoff script and entrypoint handoff section
    - d0f1133 docs(entrypoint): add passation express section for new LLM sessions
    - aa50f47 docs(todo): add archi folder guard tasks
    - 8b44ee6 chore(clean): delete archi directory (legacy)
  NextTasks:
    1. Remplacer progressivement `project_id` dans les types/query par `workspace_id` (avec compat layer de lecture)
    2. Étendre `AccessPolicy` pour supporter rôles (owner, editor, reader)
    3. Ajouter vérification par action (create/update/delete/export)
  ProposedDeliverable: feat(core): node/browser export skeleton (TD-001, KI-001)
  Risks: <1 ligne>

Instructions: Copier ce bloc dans la prochaine session, compléter ProposedDeliverable + Risks, puis demander patch tâche 1.

---
Session:
  Branch: main @ ae319eb
  Focus: TD-001, KI-001
  Deliverable: feat(core): node/browser export skeleton (TD-001, KI-001)
  Tasks:
    - Remplacer progressivement `project_id` dans les types/query par `workspace_id` (avec compat layer de lecture)
    - Étendre `AccessPolicy` pour supporter rôles (owner, editor, reader)
    - Ajouter vérification par action (create/update/delete/export)
  NextAction: patch task 1 only
````
