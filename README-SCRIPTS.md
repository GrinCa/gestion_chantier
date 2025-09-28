# 🚀 Scripts de Développement - Gestion Chantier

## ✅ **Script Principal Unifié**

### `gestion-chantier.bat` - Menu principal interactif

Remplace tous les anciens scripts par **un seul menu complet** :

```batch
# Lancer le menu principal
.\gestion-chantier.bat
```

#### 🎯 **Menu disponible**
```
🚀 DEMARRAGE RAPIDE:
[1] Start Full Stack (API + Web + Browser) 
[2] Start Dev Mode (API + Web --host pour mobile)

🔧 BUILD:
[3] Build All (Core + Web)
[4] Build Core seulement  
[5] Build Web seulement
[6] Preview Web (dist)

⚙️ CONFIGURATION:
[7] Fix .env (corriger ports/config)
[8] Changer port API
[9] Voir configuration actuelle

🛠️ MAINTENANCE:
[A] Install dependencies (npm install all)
[S] Stop all servers
[C] Clean (dist + node_modules)
```

## 📚 **Scripts Legacy (optionnel)**

### `reload.bat` - Menu développement avancé
Script historique avec options développement détaillées (conservé pour compatibilité).

## 🎯 **Workflows Recommandés**

### 🆕 **Premier lancement (nouveau projet)**
```batch
.\gestion-chantier.bat
# Choisir [A] Install dependencies
# Puis [7] Fix .env  
# Puis [1] Start Full Stack
```

### 🚀 **Développement quotidien**
```batch
.\gestion-chantier.bat
# Choisir [1] Start Full Stack (démarrage rapide)
# Ou [2] Start Dev Mode (pour test mobile)
```

### 🔨 **Build et déploiement**
```batch
.\gestion-chantier.bat
# Choisir [3] Build All
# Puis [6] Preview Web (test production)
```

### 🔧 **Changement de configuration**
```batch
.\gestion-chantier.bat
# Choisir [8] Changer port API (si conflit)
# Ou [7] Fix .env (remise à zéro config)
```

### 🧹 **Maintenance/Nettoyage**
```batch
.\gestion-chantier.bat
# Choisir [C] Clean all (si problèmes build)
# Puis [A] Install dependencies (réinstaller)
```

## 💡 **Conseils d'utilisation**

### URLs par défaut
- **Web App**: http://localhost:5173
- **API Server**: http://localhost:3001  
- **Mobile Access**: http://[IP_LOCAL]:5173 (mode dev [2])

### Test de l'architecture
1. Démarrer avec **[1] Start Full Stack**
2. Se connecter (auth sans mdp)
3. Aller dans **Calculatrice** 
4. Tester les 3 versions :
   - **Test Core** : Validation imports
   - **Nouvelle Architecture** : Interface moderne
   - **Ancienne Version** : Legacy

### Configuration ports
- Utiliser **[8]** pour changer le port API si 3001 est occupé
- Utiliser **[7]** pour remettre la config standard
- Utiliser **[9]** pour voir la config actuelle

### Arrêt propre
- **[S] Stop all servers** : Arrête tous les processus Node.js
- Ou fermer les fenêtres de serveurs individuellement

---

**Recommandation** : Utiliser `gestion-chantier.bat` comme script principal pour toutes les tâches de développement ! 🎯