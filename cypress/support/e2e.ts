// ============================================
// FICHIER: e2e.ts
// CHEMIN COMPLET: client/cypress/support/e2e.ts
// DESCRIPTION: Configuration globale des tests E2E Cypress
// VERSION: 1.0.0 - ARCH-004
// ============================================

// Import des commandes personnalisées
import './commands';

// Désactiver les erreurs non capturées
Cypress.on('uncaught:exception', (err, runnable) => {
    // Retourner false pour empêcher Cypress d'échouer le test
    console.error('Uncaught exception:', err.message);
    return false;
});

// Configuration avant chaque test
beforeEach(() => {
    // Clear localStorage et sessionStorage
    cy.clearLocalStorage();
    cy.clearCookies();

    // Intercepter les appels API pour le monitoring
    cy.intercept('POST', '**/api/auth/**').as('authRequest');
    cy.intercept('GET', '**/api/certificates/**').as('certificatesRequest');
    cy.intercept('POST', '**/api/certificates/**').as('createCertificate');
});

// Après chaque test
afterEach(function () {
    // Capturer une screenshot si le test échoue
    if (this.currentTest?.state === 'failed') {
        const testName = this.currentTest.title.replace(/\s+/g, '_');
        cy.screenshot(`FAILED_${testName}`);
    }
});

// Déclaration des types pour TypeScript
declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Connexion à l'application
             * @param email - Email de l'utilisateur
             * @param password - Mot de passe
             */
            login(email: string, password: string): Chainable<void>;

            /**
             * Déconnexion de l'application
             */
            logout(): Chainable<void>;

            /**
             * Remplir le formulaire de certificat de naissance
             * @param data - Données du certificat
             */
            fillBirthCertificateForm(data: BirthCertificateData): Chainable<void>;

            /**
             * Vérifier qu'une notification toast apparaît
             * @param message - Message attendu (partiel)
             * @param type - Type de notification (success, error, warning)
             */
            checkToast(message: string, type?: 'success' | 'error' | 'warning'): Chainable<void>;

            /**
             * Attendre le chargement de la page
             */
            waitForPageLoad(): Chainable<void>;
        }
    }
}

interface BirthCertificateData {
    childLastName: string;
    childFirstName: string;
    childGender: 'M' | 'F';
    birthDate: string;
    birthPlace: string;
    birthTime?: string;
    fatherLastName?: string;
    fatherFirstName?: string;
    fatherCni?: string;
    motherLastName: string;
    motherFirstName: string;
    motherCni?: string;
}

export { };