<!--
TEMPLATE PR
But : fournir une structure claire et exhaustive pour chaque Pull Request.
Instructions : Remplis toutes les sections applicables. Laisse N/A (ou supprime) celles non pertinentes.
Commentaires HTML comme celui-ci ne seront pas visibles dans la PR finale.
-->

## 🎯 Titre
<!-- Format recommandé: <type>: <résumé court>  (ex: feat: ajout FTS multi-termes) -->

## 📌 Résumé
<!-- 2-4 phrases : quoi + pourquoi succinct -->

## 🧠 Contexte / Motivation
<!-- Quel problème ? Quel besoin métier/technique ? Références (issue, lien doc) -->

## ✅ Changements Principaux
<!-- Liste à plat des éléments tangibles -->
- 
- 
- 

## 🛠️ Détails Techniques / Implémentation
<!-- Architecture, patterns, décisions notables, algorithmes, FTS, indexing, transactions, etc. -->

## 🧨 Breaking Changes
- [ ] Oui  
- [ ] Non  
Si oui : décrire l'impact + stratégie de migration.

### 🔄 Étapes de Migration (si applicable)
1. 
2. 

## 🧪 Tests & Couverture
- Nouveaux self-tests :
  - [ ] Ajoutés
  - [ ] Non nécessaire (justification) : 
- Scripts impactés :
- Validation manuelle :
  - Cas nominal :
  - Edge cases :
  - Erreurs attendues :

### Sortie (résumé) Self-Tests
<!-- Coller la sortie pertinente (ou un extrait) des scripts: e.g. `pnpm -F core run selftest:all` -->

```
(coller ici)
```

## 📈 Performance / Scalabilité
- Impact estimé (lecture/écriture, mémoire) :
- Tests de performance réalisés ? [ ] Oui / [ ] Non
- Observations / Régressions :

## 🔐 Sécurité / Données
- Surfaces ou vecteurs nouveaux ?
- Validation/sanitation d'entrée ?
- Accès / permissions modifiés ?

## 📄 Documentation Mise à Jour
<!-- TEST-MATRIX supprimé -->
- ARCHITECTURE.md : [ ] Oui / [ ] N/A
- GLOSSARY.md / DECISIONS.md : [ ] Oui / [ ] N/A
- README / Usage : [ ] Oui / [ ] N/A

## 🗃️ Base de Données / Persistence
- Schéma modifié ? [ ] Oui / [ ] Non
  - Migration fournie ? [ ] Oui / [ ] N/A
- Index / FTS impactés ?
- Reindexation requise ? [ ] Oui / [ ] Non

## 🧩 Compatibilité
- Versions minimales (Node/Runtime) inchangées ? [ ] Oui / [ ] Non
- Dépendances ajoutées :
- Dépendances mises à jour :

## 🧾 Log / Observabilité
- Logs ajoutés ou ajustés ?
- Métriques / instrumentation :

## 🧪 (Optionnel) Stratégie de Revue Suggérée
<!-- Ex: Lire commit par commit / Commencer par repository / Fichier clé d'abord -->

## 🗺️ Suivi / Next Steps
- 
- 

## ✅ Checklist Finale
- [ ] Build passe localement
- [ ] Lint/Typecheck OK
- [ ] Self-tests passent (`selftest:all`)
- [ ] Aucune fuite de ressource (descripteurs, handles sqlite)
- [ ] Documentation synchronisée
- [ ] Pas de TODOs oubliés (hors plan volontaire)
- [ ] Commit(s) atomiques & message(s) conformes
- [ ] Pas de secrets / chemins locaux exposés
- [ ] Diff lisible (bruit minimisé)

---
### 🔁 Variante Hotfix (utiliser si correctif critique)
<!--
Hotfix: <résumé>
Cause racine:
Impact utilisateur:
Solution appliquée:
Régression testée? (scénarios):
Backport nécessaire? Oui/Non
Post-mortem prévu? Oui/Non
-->

---
### 🧪 Exemple Court (si très petit changement)
<!--
feat: corrige tri FTS multi-termes ordre de score

Changement: Ajuste expression de scoring pour pondérer occurrences exactes.
Tests: fts-query-selftest étendu (PASS).
Docs: TODO.md mis à jour.
Risque: Faible (scoring seulement, pas de modification des résultats inclusifs).
-->

---
<!-- Fin du template -->
