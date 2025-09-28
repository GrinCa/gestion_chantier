# Dev Quickstart: Construire des outils utilisateur sans se perdre

Objectif: te donner une carte mentale + un chemin 80/20 pour ajouter un **nouvel outil orienté utilisateur** (capture / calcul / visualisation) sans devoir absorber toute la profondeur architecturale dès le début.

---
## 1. Carte mentale (couches)

| Couche | Rôle principal | Ce que tu touches pour un nouvel outil |
|--------|----------------|----------------------------------------|
| UI (web / mobile) | Composants React, interactions | Nouveau composant d'outil, appel API ou DataEngine hook |
| API Web (fetch) | Passerelles vers serveur (/workspaces, /users) | Ajout ponctuel d'une route côté serveur si besoin spécifique |
| Core (kernel) | Abstractions génériques (Resource, Repository, Services) | (Optionnel) Nouveau type de resource ou petite fonction helper |
| Services Core | Export, Import, Index, Metrics, Migration | Normalement rien à modifier pour un simple outil |
| Compat / Migration | Pont entre legacy `projets` et `workspaces` | Déjà géré → ignorer pour un outil standard |
| Serveur (Express) | Persistance legacy + auth + observabilité | Ajouter une route seulement si l'outil demande un schéma SQL custom |

> 80% du temps tu restes dans: UI + API Web. Le Core est déjà prêt à réutiliser.

---
## 2. Quand créer un nouveau type de Resource ?
Crée un type si ton outil stocke des données structurées réutilisables (ex: mesures enrichies, annotations, rapports). Sinon garde de l'état local ou un simple enregistrement existant.

Checklist Resource:
1. Définir un `type` (string unique, ex: `measurement.group` ou `report.v1`).
2. Construire l'objet Resource: `{ id, type, workspaceId, createdAt, updatedAt, version, payload, metadata? }`.
3. Sauvegarder via le Repository (ou via une API qui encapsule la même logique côté serveur plus tard).

---
## 3. Chemin rapide: outil UI simple (local) → persistant

Étapes minimalistes:
1. Créer un composant React `src/components/outils/MonNouvelOutil.tsx`.
2. Lire le workspace sélectionné (s'il existe) via composant parent / contexte.
3. Stocker d'abord l'état dans un hook local (`useState`).
4. Quand la structure se stabilise: persister.
   - Option A (legacy simple): ajouter endpoints REST dédiés (si données fortement relationnelles → SQL).
   - Option B (future‑proof + recherche): modéliser en Resource(s) et utiliser repository côté Core + un adaptateur serveur plus tard.

---
## 4. Persister en Resource (pattern recommandé)

Pseudo-code (web):
```ts
import { createInMemoryRepository } from '@gestion-chantier/core'; // ou repo existant injecté
// const repo = ... (idéalement partagé)
const resource = {
  id: crypto.randomUUID(),
  type: 'tool.mycalc.result',
  workspaceId: currentWorkspaceId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
  payload: { value: total, inputs }
};
await repo.save(resource);
```
Ensuite: `repo.list(workspaceId, { types: ['tool.mycalc.result'] })` pour récupérer.

> Remplacer plus tard le repo mémoire par un repo persistant ou appel à une API d'assemblage.

---
## 5. Accès rapide au code existant (références utiles)

| Besoin | Fichier clé |
|--------|-------------|
| Structure Resource | `packages/core/kernel/domain/Resource.ts` |
| Repository interface | `packages/core/kernel/repository/ResourceRepository.ts` |
| Export/Import | `packages/core/kernel/services/ExportService.ts`, `ImportService.ts` |
| Metrics snapshot | `packages/core/kernel/services/MetricsService.ts` |
| Compat workspace clés | `packages/core/compat/WorkspaceKeyCompat.ts` |
| Test exemple migration | `packages/core/tests/migration-service.test.ts` |
| Exemple incremental export | `packages/core/tests/integration-export-reindex-migration.test.ts` |

---
## 6. Tests ciblés (stratégie 80/20)

Type d'outil | Tests minimum
-------------|----------------
Calcul local pur | 1 test de logique pure (entrée → sortie)
Persistance Resource | 1 test repo save/list (types + filtre) + 1 test tri/cursor si pagination
Transformation/export | 1 test d'export manifest + 1 test incremental (since)

Gabarit test (Vitest):
```ts
import { describe, it, expect } from 'vitest';
import { createInMemoryRepository } from '../kernel/repository/ResourceRepository.js';

describe('my tool logic', () => {
  it('compute total', () => {
    const total = computeTotal([1,2,3]);
    expect(total).toBe(6);
  });
});
```

---
## 7. Utiliser l’observabilité pour déboguer
- `/_obs/health` : vérifier latence, index size.
- `/_obs/metrics` : confirmer exports, rejets, repository ops.
- Pendant un dev d’outil: faire un mini script qui sauvegarde N resources et inspecter `list` p95.

---
## 8. Migration terminologique (projets → workspaces)
Tu peux *déjà* utiliser l’API `getUserProjets` sans rien changer, elle tente `/workspaces` puis retombe sur `/projets`. Pour un nouvel outil: pense directement “workspace”.

Nom interne conseillé des props / variables:
```
workspaceId (pas projectId)
currentWorkspace / setWorkspace
```

---
## 9. Décider: SQL direct vs Resource
| Critère | Choisir SQL table | Choisir Resource |
|---------|------------------|------------------|
| Requêtes complexes (JOIN, agrégats) | ✔ | ✖ (ou plus tard via indexer avancé) |
| Recherche texte / filtrage générique | Moyen (requêtes custom) | ✔ (fullText + index évolutif) |
| Schéma évolutif incertain | Migration SQL à gérer | ✔ (payload libre) |
| Besoin d’export/backup automatique | Personnalisé | ✔ natif |

---
## 10. Roadmap personnelle (conseillée)
1. Crée un outil purement UI (aucune persistance) → commit.
2. Ajoute un Resource simple pour stocker un résultat calculé → test.
3. Ajoute une vue “historique” listant ces resources → tri & filtre.
4. Ajoute export (manifest) pour ce type → vérifie metrics export.
5. (Plus tard) Ajoute recherche fullText sur un champ clé.

Chaque étape reste < 1h et te fait toucher une seule abstraction à la fois.

---
## 11. Raccourcis mentaux
- Tu n’as pas besoin de lire tous les services du core avant d’agir.
- Les tests existants servent de documentation vivante: cherche un mot-clé et copie le pattern.
- Toute nouveauté côté persistance: commence en mémoire → bascule plus tard côté serveur si justifié.
- Si tu écris plus de 30 lignes pour persister un objet: reviens à la table de décision (SQL vs Resource).

---
## 12. Mini FAQ
**Q: Comment éviter de casser la migration workspace ?**
Utilise toujours `workspaceId` dans les nouveaux noms de variables. Ne crée pas de nouveau code qui référence `project_id`.

**Q: Où logguer des métriques custom ?**
Pour un outil user simple: inutile. Si un jour besoin → émettre un event via EventBus et laisser MetricsService compter.

**Q: Puis-je exporter seulement mon type ?**
Oui: aujourd’hui ExportService exporte tout; tu peux soit filtrer côté consommateur, soit implémenter un futur `exportWorkspaceFiltered(types[])` (pattern déjà prêt avec `repo.list(types: [...])`).

---
## 13. Quand demander une refacto ?
- Si un composant React dépasse ~300 lignes.
- Si tu ré-écris plus de 2 fois le même schéma Resource (factoriser un builder).
- Si tu ajoutes un second endpoint serveur ressemblant à un repository générique : il est temps d’intégrer côté Core.

---
## 14. À retenir
Commence petit, manipule `Resource` seulement quand nécessaire, appuie-toi sur les tests comme guide et ignore les couches profondes tant que ton outil ne les requiert pas.

Bon dev 👷‍♂️🛠
