// ============================================
// FICHIER: cypress.config.ts
// CHEMIN COMPLET: client/cypress.config.ts
// DESCRIPTION: Configuration Cypress pour tests E2E
// VERSION: 1.0.0 - ARCH-004
// ============================================

import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        // URL de base de l'application
        baseUrl: 'http://localhost:5173',

        // Dossier des specs
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',

        // Dossier des fixtures
        fixturesFolder: 'cypress/fixtures',

        // Dossier de support
        supportFile: 'cypress/support/e2e.ts',

        // Screenshots et vidéos
        screenshotsFolder: 'cypress/screenshots',
        videosFolder: 'cypress/videos',
        video: true,
        screenshotOnRunFailure: true,

        // Timeouts
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 30000,
        pageLoadTimeout: 60000,

        // Viewport
        viewportWidth: 1280,
        viewportHeight: 720,

        // Retries
        retries: {
            runMode: 2,
            openMode: 0
        },

        // Variables d'environnement
        env: {
            apiUrl: 'http://localhost:3000/api',
            coverage: false
        },

        // Setup des tests
        setupNodeEvents(on, config) {
            // Plugins
            on('task', {
                log(message) {
                    console.log(message);
                    return null;
                },
                // Nettoyer la base de test
                async resetDatabase() {
                    // Implémenter si nécessaire
                    return null;
                }
            });

            return config;
        }
    },

    // Configuration du composant testing (optionnel)
    component: {
        devServer: {
            framework: 'react',
            bundler: 'vite'
        },
        specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}'
    }
});