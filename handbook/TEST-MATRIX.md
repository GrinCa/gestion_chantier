<!-- DEPRECATED: This file was intentionally collapsed to remove noise. -->
# (Removed) Test Coverage Matrix

Ce document a été supprimé en faveur d'une approche "self-discovery" :

- Les selftests sont listés dans `packages/core/scripts/*selftest.ts`.
- La stratégie de tests est implicitement couverte par la structure du dossier.
- Si un jour un tableau regenerable est utile, créer un script `scripts/gen-test-matrix.mjs` qui scanne les selftests et produit un rapport éphémère.

Raison: réduire le bruit et éviter la dérive documentaire.

Si tu lis ceci et veux restaurer une matrice, fais-le via génération automatique (pas de maintenance manuelle).
