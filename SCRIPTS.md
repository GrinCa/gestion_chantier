# Scripts & Outils de Développement

Ce document unifie les contenus précédemment dispersés dans `README-SCRIPTS.md` et `SCRIPTS-INFO.md`. Il décrit les deux batch principaux et conventions d'usage. Toute nouvelle fonctionnalité script doit être ajoutée ici (pas de nouveaux fichiers README multiples).

## 1. Scripts Principaux

### 1.1 `gestion-chantier.bat` (Menu principal)
Usage quotidien (démarrage, build, config légère, maintenance simple).

Fonctions clés:
- Start Full Stack (API + Web)
- Start Dev Mode (API + Web --host pour tests mobiles)
- Build (core + web) / build ciblé
- Preview dist
- Fix `.env` / changer port API / afficher config
- Install dependencies / Stop all / Clean (dist + node_modules)

### 1.2 `maintenance.bat` (Maintenance avancée)
Usage occasionnel. Contient opérations destructives encadrées par confirmations.

Catégories:
- Clean builds (safe)
- Réinstallations contrôlées
- Purges dépendances (danger)
- Reset complet (double confirmation)

## 2. Flux de Travail Recommandés

### Premier lancement
```
gestion-chantier.bat
  [A] Install dependencies
  [7] Fix .env
  [1] Start Full Stack
```

### Développement récurrent
```
gestion-chantier.bat
  [1] Start Full Stack   # OU [2] Start Dev Mode
```

### Build préparation déploiement
```
gestion-chantier.bat
  [3] Build All
  [6] Preview Web
```

### Nettoyage problème build
```
gestion-chantier.bat
  [C] Clean
  [A] Install dependencies
```

## 3. Politique Sécurité / Risques
- Le script principal n'efface pas `node_modules`.
- Les opérations potentiellement destructives sont isolées dans `maintenance.bat`.
- Double confirmation pour les resets profonds.

## 4. Règles d'Évolution
1. Pas de duplication de logique entre les deux batch (facteur commun si nécessaire).
2. Pas d'ajout d'un troisième script généraliste — étendre menu existant.
3. Toute nouvelle option doit avoir : nom court, description, impact (safe/dangerous).
4. Interdiction d'introduire des emojis dans les scripts (politique globale). 

## 5. Améliorations Futures (Backlog Légère)
- Détection automatique port occupé avec suggestion alternative.
- Option self-test (agrégation future des *-selftest.ts).
- Rapport succinct post-build (taille bundles / temps).

## 6. Migration (Historique)
Anciennes docs scripts fusionnées le 2025-09-28 (`README-SCRIPTS.md`, `SCRIPTS-INFO.md`).

---
Mainteneur: Garder ce fichier concis (< ~160 lignes). Ajouter sections uniquement si durable.
