/**
 * CONFIGURATION VALIDATOR - .env Consistency Checker
 * ==================================================
 * Script pour valider et corriger la cohérence entre .env et core/config
 */

import { CONFIG, validateConfig, getApiUrl } from '../config/index.js';
import * as fs from 'fs';
import * as path from 'path';

// Chemin vers le fichier .env racine
const ENV_PATH = path.join(process.cwd(), '../../.env');

export function checkEnvConsistency() {
  console.log('🔍 Vérification cohérence configuration...\n');
  
  // Validation de la config actuelle
  const validation = validateConfig();
  
  console.log('📊 Configuration actuelle:');
  Object.entries(validation.config).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();
  
  if (validation.warnings.length > 0) {
    console.log('⚠️  Avertissements:');
    validation.warnings.forEach((warning: string) => console.log(`  - ${warning}`));
    console.log();
  }
  
  // Lecture du .env actuel
  let envContent = '';
  try {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
    console.log('✅ Fichier .env trouvé');
  } catch (error) {
    console.log('❌ Fichier .env non trouvé:', ENV_PATH);
    return false;
  }
  
  // Suggestion de correction
  if (!validation.isValid) {
    console.log('\n🔧 Suggestions de correction:');
    
    const apiPort = CONFIG.API_PORT;
    const expectedViteApiUrl = `http://localhost:${apiPort}`;
    
    console.log(`  VITE_API_URL=${expectedViteApiUrl}`);
    console.log(`  API_PORT=${apiPort}`);
    console.log(`  PORT=${apiPort}`);
    
    return false;
  }
  
  console.log('✅ Configuration cohérente !');
  return true;
}

// Fonction pour auto-corriger le .env
export function fixEnvFile() {
  console.log('🔧 Correction automatique du fichier .env...\n');
  
  const apiPort = CONFIG.API_PORT;
  const webPort = CONFIG.WEB_DEV_PORT;
  const apiUrl = `http://localhost:${apiPort}`;
  
  const correctedEnv = `# Configuration Gestion Chantier - Development
# ============================================
# ⚠️  Fichier généré automatiquement - Modifiez avec précaution

# API Server - Port unifié
PORT=${apiPort}
API_PORT=${apiPort}

# Authentification
AUTH_MODE=dev
# AUTH_MODE=strict  # Pour mode production avec mot de passe

# Base de données
DB_NAME=users.db

# Web Development - URL cohérente avec API_PORT
VITE_API_URL=${apiUrl}
VITE_PORT=${webPort}

# Mode développement
NODE_ENV=development

# ===== NOTES =====
# - PORT et API_PORT doivent être identiques
# - VITE_API_URL doit correspondre à http://localhost:[API_PORT]
# - Ces valeurs sont lues par packages/core/config/index.ts
`;
  
  try {
    fs.writeFileSync(ENV_PATH, correctedEnv, 'utf8');
    console.log('✅ Fichier .env corrigé avec succès !');
    console.log(`📍 Chemin: ${ENV_PATH}`);
    console.log(`🔌 API: ${apiUrl}`);
    console.log(`🌐 Web: http://localhost:${webPort}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    return false;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  console.log('🚀 Validation Configuration Gestion Chantier\n');
  
  const isValid = checkEnvConsistency();
  
  if (!isValid) {
    console.log('\n❓ Voulez-vous corriger automatiquement ? (Cette action écrasera le .env actuel)');
    console.log('   Pour corriger: npm run fix-config');
  }
}