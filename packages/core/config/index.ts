/**
 * CONFIGURATION CENTRALE - Gestion Chantier
 * ==========================================
 * Configuration centralisée pour tous les packages du monorepo
 */

// ===== PORTS ET SERVEURS =====
export const CONFIG = {
  // Ports par défaut
  API_PORT: 3001,
  WEB_DEV_PORT: 5173,
  WEB_PREVIEW_PORT: 4173,
  
  // URLs
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-api.com' 
    : `http://localhost:3001`,
    
  // Base de données
  DB_NAME: 'users.db',
  
  // Authentification
  AUTH_SANS_MDP: true, // Mode dev sans mot de passe
  
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
  const apiPort = port || CONFIG.API_PORT;
  return process.env.NODE_ENV === 'production' 
    ? CONFIG.API_BASE_URL 
    : `http://localhost:${apiPort}`;
};

export const getWebUrl = (port?: number) => {
  const webPort = port || CONFIG.WEB_DEV_PORT;
  return `http://localhost:${webPort}`;
};

// ===== EXPORT DEFAULT =====
export default CONFIG;