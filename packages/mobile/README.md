# 📱 PACKAGE MOBILE - React Native + Expo

## 🎯 **Vue d'ensemble**

Application mobile React Native utilisant **Expo** et la **logique métier du core** pour une architecture universelle parfaite.

### ✅ **Architecture**

```
packages/mobile/
├── App.tsx                    # App principale avec navigation
├── app.json                   # Configuration Expo
├── package.json               # Dépendances React Native
├── src/
│   ├── screens/               # Écrans de l'app
│   │   ├── HomeScreen.tsx     # Accueil
│   │   ├── CalculatriceScreen.tsx  # 📐 Calculatrice (utilise le core!)
│   │   ├── WorkspacesScreen.tsx # Gestion workspaces (ex-projets)
│   │   └── SettingsScreen.tsx # Paramètres
│   ├── hooks/                 # Hooks React Native
│   │   └── useMobileDataEngine.tsx  # Hook DataEngine mobile
│   ├── adapters/              # Adapters mobiles
│   │   └── mobile-adapters.ts # AsyncStorage + fetch adapters
│   └── components/            # Composants réutilisables
└── assets/                    # Images, icônes, etc.
```

## 🚀 **Fonctionnalités Clés**

### 📐 **Calculatrice Mobile**
- **Même logique métier** que la version Web
- Import direct : `import { calculatriceTool } from '@gestion-chantier/core'`
- Interface tactile optimisée
- Sauvegarde via DataEngine

### 💾 **DataEngine Mobile**
- **AsyncStorage** : Stockage local React Native
- **Fetch API** : Communication avec le serveur
- **Auto-sync** : Synchronisation automatique
- **Offline-first** : Fonctionne sans réseau

### 🎨 **Interface**
- **React Native Paper** : Material Design
- **React Navigation** : Navigation native
- **Expo Icons** : Icônes vectorielles
- **Safe Area** : Respect des encoches

## 🛠️ **Installation & Setup**

### 1. **Installation des dépendances**
```bash
# Depuis la racine du monorepo
npm run install:all

# Ou spécifiquement mobile
cd packages/mobile
npm install
```

### 2. **Build du core** (requis)
```bash
# Le mobile a besoin du core buildé
npm run build:core
```

### 3. **Lancement du développement mobile**
```bash
# Option 1: Depuis la racine
npm run dev:mobile

# Option 2: Dans le dossier mobile
cd packages/mobile
npm start
```

### 4. **Expo Dev Tools**
- Ouvre automatiquement http://localhost:19006
- Scan QR code avec l'app Expo Go
- Ou utilise émulateur Android/iOS

## 📱 **Plateformes Supportées**

### ✅ **Android**
- Émulateur Android Studio
- Device physique via Expo Go
- Build APK : `npm run build:android`

### ✅ **iOS**
- Simulateur Xcode (macOS uniquement)
- Device physique via Expo Go  
- Build IPA : `npm run build:ios`

### 🌐 **Web / PWA**
- Dev server : `npm run web`
- Export statique (PWA) : `npm run build:web`
- Alias : `npm run export:web` (identique)

Notes:
- L'ancienne commande `expo build:web` est dépréciée. Remplacée par `expo export --platform web`.
- Le résultat est généré dans `packages/mobile/web-build/` prêt pour déploiement statique.

## 🔧 **Configuration**

### **API Connection**
```typescript
// mobile-adapters.ts
export const MOBILE_CONFIG = {
  API_URL: 'http://10.0.2.2:3001',  // Android emulator
  API_URL_IOS: 'http://localhost:3001',  // iOS simulator
}
```

### **Storage**
- **AsyncStorage** : Remplace localStorage du web
- **DataEngine** : Même interface que la version web
- **Auto-persistence** : Sauvegarde automatique

## 🎯 **Usage de la Calculatrice**

### **Logique métier identique**
```typescript
// CalculatriceScreen.tsx
import { calculatriceTool, LABELS_PREDEFINIS } from '@gestion-chantier/core';

// Même API que la version Web !
const [groups, setGroups] = useState(() => calculatriceTool.getDefaultData());
const stats = calculatriceTool.getAllGroupsStats(groups);
const updated = calculatriceTool.addGroupe(groups, 'Position 1');
```

### **Interface mobile optimisée**
- **TouchableOpacity** : Boutons tactiles
- **TextInput** : Saisie numérique optimisée
- **ScrollView** : Navigation fluide
- **Cards** : Organisation visuelle claire

## 🔄 **Synchronisation**

### **DataEngine Mobile**
```typescript
// useMobileDataEngine.tsx
const { dataEngine, isOnline, syncStatus } = useMobileDataEngine();

// Nouvelle API (Project renommé en Workspace)
await dataEngine.createWorkspace(workspace);
await dataEngine.createData(workspaceId, 'measurement', data, 'calculatrice');

// Ancienne API (DEPRECATED – sera supprimée après période de transition)
// await dataEngine.createProject(project);
// await dataEngine.createData(projectId, 'measurement', data, 'calculatrice');
```

### **Auto-sync**
- Synchronisation automatique toutes les 30 secondes
- Détection online/offline
- File d'attente pour changements offline

## 🎊 **Architecture Universelle**

### **Code partagé**
```
Core Package:
├── calculatriceTool      # ✅ Partagé Web + Mobile
├── DataEngine           # ✅ Partagé Web + Mobile  
├── Types                # ✅ Partagé Web + Mobile
└── Configuration        # ✅ Partagé Web + Mobile
```

### **Code spécifique**
```
Web:               Mobile:
├── React DOM      ├── React Native
├── Tailwind       ├── React Native Paper
├── localStorage   ├── AsyncStorage
└── fetch          └── fetch (React Native)
```

## 🚀 **Next Steps**

1. **Test sur device** : Scanner QR code avec Expo Go
2. **Renommer définitivement UI** : Remplacer "projet" par "workspace" dans les écrans restants
3. **Développer screens** : Authentification, gestion avancée workspace
4. **Build production** : APK/IPA pour distribution
5. **Store deployment** : Google Play / App Store

---

## 🔄 Migration Project → Workspace

| Avant | Après | Statut |
|-------|-------|--------|
| createProject | createWorkspace | ✅ Utiliser maintenant |
| getProject | getWorkspace | ✅ |
| getUserProjects | getUserWorkspaces | ✅ |
| useMobileProjects | useMobileWorkspaces | ✅ alias conservé |
| projectId (variables) | workspaceId | À migrer progressivement |

Notes:
- Les clés de stockage internes conservent encore le préfixe `project:` pendant la phase de transition.
- Les événements utilisent désormais `workspace` comme `entityType`.
- Les anciennes méthodes sont maintenues comme wrappers avec @deprecated (à venir dans la doc technique) et seront retirées dans une future version majeure.

---

**Résultat** : 🎉 **Architecture universelle complète** - Même logique métier, interfaces natives optimisées ! 📱