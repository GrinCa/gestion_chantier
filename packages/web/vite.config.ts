import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Alias sqlite3 -> stub (empêche inclusion modules Node dans bundle browser)
const alias = {
  sqlite3: '/src/stubs/sqlite3-browser-stub.ts'
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias },
  
  // Configuration pour les variables d'environnement
  define: {
    // Injecte les variables d'environnement côté client
    'globalThis.import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001'),
    'globalThis.import.meta.env.API_PORT': JSON.stringify(process.env.API_PORT || '3001'),
    'globalThis.import.meta.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  
  // Variables d'environnement exposées au client (préfixe VITE_)
  envPrefix: 'VITE_',
})
