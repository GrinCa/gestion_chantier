# 🔧 SCRIPTS GESTION CHANTIER

## 📋 **Scripts disponibles :**

### 🚀 **gestion-chantier.bat** (Script principal)
- **Usage quotidien** : Démarrage, build, développement
- **Sécurisé** : Pas d'opérations destructives
- **Fonctionnalités** :
  - ✅ Démarrage Full Stack + Mobile
  - ✅ Build packages (Core + Web + Mobile)
  - ✅ Configuration automatique
  - ✅ Installation dépendances
  - ✅ Arrêt serveurs

### 🧹 **maintenance.bat** (Maintenance avancée)
- **Usage occasionnel** : Nettoyage et réparation
- **⚠️ Attention** : Opérations destructives possibles
- **Protections** :
  - 🔒 Confirmations multiples
  - 🔒 Saisies sécurisées ("OUI", "DELETE EVERYTHING")
  - 🔒 Séparation nettoyage safe/dangereux

## 🎯 **Recommandations d'usage :**

### 📅 **Usage quotidien** → `gestion-chantier.bat`
```bat
[1] Start Full Stack        # Développement web
[3] Start Mobile           # Développement mobile
[4] Start All              # Développement complet
[I] Install Dependencies   # Première installation
```

### 🆘 **En cas de problème** → `maintenance.bat`  
```bat
[1-4] Clean Builds         # Safe - supprime que les dist
[R1-R5] Reinstall         # Réinstallation propre
[D1-D5] Clean Dependencies # Dangereux - avec confirmation
[D5] NUKE ALL             # Très dangereux - reset complet
```

## 🛡️ **Sécurité :**

- **Script principal** : Aucune suppression de node_modules
- **Script maintenance** : Confirmations obligatoires
- **Protection double** : Saisie exacte requise pour NUKE ALL
- **Séparation claire** : Pas de mélange des responsabilités

---

✅ **Architecture sécurisée** - Risque d'erreur utilisateur réduit !