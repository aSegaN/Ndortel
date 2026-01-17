// ============================================
// NDORTEL - Configuration Vite pour Docker
// Version: 1.0.0
// Description: Configuration Vite optimisée pour l'environnement Docker
// ============================================
// Utilisez ce fichier comme référence pour votre vite.config.ts
// en environnement Docker
// ============================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  
  // Configuration du serveur de développement
  server: {
    // Écouter sur toutes les interfaces (nécessaire pour Docker)
    host: '0.0.0.0',
    port: 5173,
    
    // Permettre l'accès depuis l'hôte Docker
    strictPort: true,
    
    // Hot Module Replacement
    hmr: {
      // Configuration HMR pour Docker
      clientPort: 5173,
      host: 'localhost'
    },
    
    // Configuration du proxy API
    proxy: {
      '/api': {
        // En Docker, le backend est accessible via le nom du service
        target: process.env.VITE_API_URL || 'http://backend:5005',
        changeOrigin: true,
        secure: false,
        // Logging pour le debug
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url, '→', proxyReq.path);
          });
        }
      }
    },
    
    // Surveillance des fichiers
    watch: {
      // Utiliser le polling pour Docker (meilleure compatibilité)
      usePolling: true,
      interval: 1000
    }
  },
  
  // Configuration du build
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Optimisations
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          pdf: ['jspdf']
        }
      }
    }
  },
  
  // Résolution des modules
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  
  // Variables d'environnement exposées au client
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
});
