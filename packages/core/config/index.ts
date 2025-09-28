/**
 * CONFIGURATION CENTRALE - Gestion Chantier
 * ==========================================
 * Configuration centralisée pour tous les packages du monorepo
 * Compatible Node.js et navigateur
 */

// ===== DETECTION ENVIRONNEMENT =====
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.env;

// Helper pour lire les variables d'environnement de façon sécurisée
const getEnv = (key: string, fallback: string = ''): string => {
  if (isBrowser) {
    // Côté navigateur : utilise import.meta.env (Vite) ou valeurs par défaut
    try {
      const env = (import.meta as any)?.env || {};
      return env[key] || fallback;
    } catch {
      // Fallback sur valeurs hardcodées pour le navigateur
      const browserDefaults: Record<string, string> = {
        'VITE_API_URL': 'http://localhost:3001',
        'API_PORT': '3001',
        'PORT': '3001',
        'VITE_PORT': '5173',
        'NODE_ENV': 'development',
        'AUTH_MODE': 'dev',
        'DB_NAME': 'users.db'
      };
      return browserDefaults[key] || fallback;
    }
  } else if (isNode) {
    // Côté Node.js : utilise process.env
    return process.env[key] || fallback;
  }
  return fallback;
};

// ===== PORTS ET SERVEURS =====
export const CONFIG = {
  // Ports - Valeurs par défaut avec possibilité de override
  API_PORT: parseInt(getEnv('API_PORT') || getEnv('PORT') || '3001'),
  WEB_DEV_PORT: parseInt(getEnv('VITE_PORT', '5173')),
  WEB_PREVIEW_PORT: parseInt(getEnv('VITE_PREVIEW_PORT', '4173')),
  
  // URLs - Construction dynamique
  API_BASE_URL: (() => {
    const nodeEnv = getEnv('NODE_ENV');
    if (nodeEnv === 'production') {
      return getEnv('VITE_API_URL', 'https://your-production-api.com');
    }
    // En développement
    const apiPort = parseInt(getEnv('API_PORT') || getEnv('PORT') || '3001');
    return getEnv('VITE_API_URL') || `http://localhost:${apiPort}`;
  })(),
    
  // Base de données - Node.js seulement
  DB_NAME: getEnv('DB_NAME', 'users.db'),
  
  // Authentification
  AUTH_SANS_MDP: getEnv('AUTH_MODE') !== 'strict', // true par défaut sauf si AUTH_MODE=strict
  
  // DataEngine
  DATA_ENGINE: {
    CACHE_SIZE: 1000,
    SYNC_INTERVAL: 30000, // 30 secondes
    OFFLINE_TIMEOUT: 5000, // 5 secondes
  },
  
  // Development
  DEV: {
    AUTO_OPEN_BROWSER: true,
    HOT_RELOAD: true,
    HOST_ALL_INTERFACES: true, // Pour accès mobile
  }
} as const;

// ===== HELPERS =====
export const getApiUrl = (port?: number) => {
  // En priorité : port passé en paramètre, puis config
  const apiPort = port || CONFIG.API_PORT;
  
  const nodeEnv = getEnv('NODE_ENV');
  if (nodeEnv === 'production') {
    return CONFIG.API_BASE_URL;
  }
  
  // En développement, utilise VITE_API_URL si défini, sinon construit l'URL
  return getEnv('VITE_API_URL') || `http://localhost:${apiPort}`;
};

export const getWebUrl = (port?: number) => {
  const webPort = port || CONFIG.WEB_DEV_PORT;
  return `http://localhost:${webPort}`;
};

// Helper pour vérifier la cohérence des configurations
export const validateConfig = () => {
  const warnings: string[] = [];
  
  // Vérifie que VITE_API_URL correspond au port API (seulement côté Node.js)
  if (isNode) {
    const viteApiUrl = getEnv('VITE_API_URL');
    const apiPort = getEnv('API_PORT');
    if (viteApiUrl && apiPort) {
      const expectedUrl = `http://localhost:${apiPort}`;
      if (viteApiUrl !== expectedUrl) {
        warnings.push(`VITE_API_URL (${viteApiUrl}) ne correspond pas au port API (${apiPort})`);
      }
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    config: {
      API_PORT: CONFIG.API_PORT,
      API_URL: getApiUrl(),
      WEB_DEV_PORT: CONFIG.WEB_DEV_PORT,
      AUTH_MODE: CONFIG.AUTH_SANS_MDP ? 'dev' : 'strict',
      DB_NAME: CONFIG.DB_NAME,
      ENVIRONMENT: isBrowser ? 'browser' : 'node'
    }
  };
};

// ===== EXPORT DEFAULT =====
export default CONFIG;