# Workspace Overview

Monorepo multi-surfaces (core, web, mobile, server) avec scripts minimalistes pour qualité locale et gestion de la dette.

## Qualité Locale
Pipeline unique:
```
npm run check   # alias local-check (lint baseline → build → tests core)
```
Skips urgents (à éviter):
```
LOCAL_CHECK_SKIP_LINT=true LOCAL_CHECK_SKIP_BUILD=true LOCAL_CHECK_SKIP_TESTS=true node scripts/local-check.mjs
```

## Gestion Dette Technique
Fichier actif: `handbook/TECH-DEBT.md` (tableau OPEN/DONE + sections). Archive: `handbook/TECH-DEBT-ARCHIVE.md`.

Lister:
```
node scripts/debt-maintain.mjs --list
```
Nouvelle dette (ID auto):
```
node scripts/debt-maintain.mjs --new "Refactor repository layer" --category Core --priority High --exit "Couche isolée + tests migration"
```
Archiver COOLDOWN expirées (>14j par défaut):
```
node scripts/debt-maintain.mjs --archive-stale
```

## Frontend (Vite + React)
Stack minimale avec HMR et ESLint rules.

Plugins disponibles:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) (Babel Fast Refresh)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) (SWC Fast Refresh)

## ESLint Type-Aware (exemple)

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

Pour lancer l'API backend Node.js, tu dois exécuter une commande du type :
  node <nom_du_fichier_backend>.js

Mais il faut d'abord identifier le fichier principal de ton backend (souvent nommé `server.js`, `index.js`, `app.js` ou similaire).

Étapes :
1. Va dans le dossier du backend (ex : `api`, `backend`, ou la racine si tout est mélangé).
2. Cherche un fichier comme `server.js`, `index.js`, `app.js` ou regarde dans le fichier `package.json` la propriété `"main"` ou les scripts `"start"`/`"dev"`.
3. Lance la commande :
   ```
   node server.js
   ```
   ou
   ```
   node app.js
   ```
   ou
   ```
   npm start
   ```
   selon ce que tu trouves.

Si tu ne sais pas quel fichier utiliser :
- Liste les fichiers JS à la racine ou dans le dossier backend.
- Ouvre le fichier qui contient le code d'initialisation du serveur (souvent avec `express()`, `app.listen(...)`, etc.).
- Utilise ce nom de fichier dans la commande `node`.

Exemple :
```
node server.js
```
ou
```
npm start
```

Si tu veux que je t'aide à identifier le bon fichier, donne-moi la liste des fichiers JS présents à la racine ou dans le dossier backend.
