// ============================================
// FICHIER: vite.config.ts (SÉCURISÉ)
// ============================================
// 
// ⚠️ CHANGEMENT CRITIQUE DE SÉCURITÉ:
// La clé API Gemini n'est PLUS exposée côté client.
// Toutes les requêtes IA passent maintenant par le backend.
// ============================================

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // Proxy pour le développement local
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Optimisations de production
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Séparer les vendors pour un meilleur caching
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['recharts'],
          'pdf-vendor': ['jspdf', 'qrcode'],
        },
      },
    },
  },
  // ============================================
  // 🔒 SÉCURITÉ: Plus de secrets exposés ici
  // ============================================
  // AVANT (VULNÉRABLE):
  // define: {
  //   'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
  // }
  //
  // APRÈS (SÉCURISÉ):
  // Les appels IA passent par /api/ai/* qui sont proxifiés vers le backend
  // ============================================
  define: {
    // Variables d'environnement sûres uniquement (non sensibles)
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
