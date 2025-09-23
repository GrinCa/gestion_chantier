# Guide de création et d'organisation d'un outil dans l'application

## 1. Structure des dossiers

Tous les outils sont regroupés dans `src/components/outils/`.
Chaque outil a son propre sous-dossier :

- `src/components/outils/<nom-outil>/`
  - Exemple : `calculatrice`, `releve`, `export`, etc.

## 2. Fichiers types pour un outil

Dans chaque dossier d'outil :
- `Outil<Nom>.tsx` : composant principal de l'outil (UI, logique)
- `<Nom>Route.tsx` : composant de "page" qui gère l'accès, les droits, le retour, etc.
- (optionnel) `<Nom>View.tsx` : si besoin d'une vue intermédiaire ou d'une navigation spécifique

## 3. Exemple pour un outil "Calculatrice"

```
src/components/outils/calculatrice/
  OutilCalculatriceMoyenne.tsx   // UI et logique de la calculatrice
  CalculatriceRoute.tsx          // Page/route, gère l'accès, le retour
  CalculatriceView.tsx           // (optionnel) Vue avec bouton retour
```

## 4. Intégration dans l'app
- Les routes/pages principales (UserView, AdminView, etc.) importent le composant "Route" de l'outil.
- Les droits d'accès sont vérifiés dans le composant Route (ex : `userTools.includes("calculatrice")`).
- Le composant principal de l'outil ne gère que l'UI et la logique métier.

## 5. Bonnes pratiques
- Un outil = un dossier dédié.
- Pas de logique d'accès/droits dans le composant principal, mais dans la Route.
- Les noms de fichiers doivent être explicites : `Outil<Nom>.tsx`, `<Nom>Route.tsx`.
- Ajouter un README.md dans chaque dossier d'outil pour expliquer le fonctionnement si besoin.

---

**Pour créer un nouvel outil :**
1. Crée un dossier dans `src/components/outils/`.
2. Ajoute un composant principal `Outil<Nom>.tsx`.
3. Ajoute un composant `<Nom>Route.tsx` pour la gestion des droits/navigation.
4. Importe la Route dans `UserView` ou `AdminView` selon les droits.

> Ce fichier doit être placé dans `src/components/outils/README.md` pour servir de référence à tous les développeurs.
