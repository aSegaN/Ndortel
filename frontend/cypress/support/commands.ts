// ============================================
// FICHIER: commands.ts
// CHEMIN COMPLET: client/cypress/support/commands.ts
// DESCRIPTION: Commandes personnalisées Cypress
// VERSION: 1.0.0 - ARCH-004
// ============================================

// ============================================
// COMMANDE: login
// ============================================
Cypress.Commands.add('login', (email: string, password: string) => {
    cy.session([email, password], () => {
        cy.visit('/login');
        cy.get('[data-cy="email-input"]').type(email);
        cy.get('[data-cy="password-input"]').type(password);
        cy.get('[data-cy="login-button"]').click();

        // Attendre la redirection vers le dashboard
        cy.url().should('include', '/dashboard');

        // Vérifier que le token est stocké
        cy.window().then((win) => {
            expect(win.localStorage.getItem('token')).to.exist;
        });
    }, {
        validate() {
            // Valider que la session est toujours active
            cy.window().then((win) => {
                const token = win.localStorage.getItem('token');
                expect(token).to.exist;
            });
        }
    });
});

// ============================================
// COMMANDE: logout
// ============================================
Cypress.Commands.add('logout', () => {
    cy.get('[data-cy="user-menu"]').click();
    cy.get('[data-cy="logout-button"]').click();

    // Vérifier la redirection vers login
    cy.url().should('include', '/login');

    // Vérifier que le token est supprimé
    cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
    });
});

// ============================================
// COMMANDE: fillBirthCertificateForm
// ============================================
Cypress.Commands.add('fillBirthCertificateForm', (data) => {
    // Informations de l'enfant
    cy.get('[data-cy="child-lastname"]').clear().type(data.childLastName);
    cy.get('[data-cy="child-firstname"]').clear().type(data.childFirstName);
    cy.get(`[data-cy="gender-${data.childGender}"]`).click();
    cy.get('[data-cy="birth-date"]').clear().type(data.birthDate);
    cy.get('[data-cy="birth-place"]').clear().type(data.birthPlace);

    if (data.birthTime) {
        cy.get('[data-cy="birth-time"]').clear().type(data.birthTime);
    }

    // Informations du père (optionnel)
    if (data.fatherLastName) {
        cy.get('[data-cy="father-lastname"]').clear().type(data.fatherLastName);
    }
    if (data.fatherFirstName) {
        cy.get('[data-cy="father-firstname"]').clear().type(data.fatherFirstName);
    }
    if (data.fatherCni) {
        cy.get('[data-cy="father-cni"]').clear().type(data.fatherCni);
    }

    // Informations de la mère (requis)
    cy.get('[data-cy="mother-lastname"]').clear().type(data.motherLastName);
    cy.get('[data-cy="mother-firstname"]').clear().type(data.motherFirstName);

    if (data.motherCni) {
        cy.get('[data-cy="mother-cni"]').clear().type(data.motherCni);
    }
});

// ============================================
// COMMANDE: checkToast
// ============================================
Cypress.Commands.add('checkToast', (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    cy.get(`.toast-${type}, [data-cy="toast-${type}"], .Toastify__toast--${type}`)
        .should('be.visible')
        .and('contain.text', message);
});

// ============================================
// COMMANDE: waitForPageLoad
// ============================================
Cypress.Commands.add('waitForPageLoad', () => {
    // Attendre que le loader disparaisse
    cy.get('[data-cy="loading-spinner"]', { timeout: 10000 }).should('not.exist');

    // Attendre que le contenu principal soit visible
    cy.get('[data-cy="main-content"], main, #root').should('be.visible');
});

// ============================================
// COMMANDES API
// ============================================

// Login via API (plus rapide pour les tests)
Cypress.Commands.add('loginViaApi', (email: string, password: string) => {
    cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/login`,
        body: { email, password }
    }).then((response) => {
        expect(response.status).to.eq(200);
        window.localStorage.setItem('token', response.body.token);
        window.localStorage.setItem('user', JSON.stringify(response.body.user));
    });
});

// Créer un certificat via API
Cypress.Commands.add('createCertificateViaApi', (data: any) => {
    cy.window().then((win) => {
        const token = win.localStorage.getItem('token');

        cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/certificates`,
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: data
        }).then((response) => {
            expect(response.status).to.eq(201);
            return response.body;
        });
    });
});

// Déclaration pour TypeScript
declare global {
    namespace Cypress {
        interface Chainable {
            loginViaApi(email: string, password: string): Chainable<void>;
            createCertificateViaApi(data: any): Chainable<any>;
        }
    }
}

export { };