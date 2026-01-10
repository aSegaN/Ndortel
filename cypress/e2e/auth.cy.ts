// ============================================
// FICHIER: auth.cy.ts
// CHEMIN COMPLET: client/cypress/e2e/auth.cy.ts
// DESCRIPTION: Tests E2E d'authentification
// VERSION: 1.0.0 - ARCH-004
// ============================================

describe('Authentification', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  // ----------------------------------------
  // Tests de la page de login
  // ----------------------------------------
  describe('Page de connexion', () => {
    it('devrait afficher le formulaire de connexion', () => {
      cy.get('[data-cy="login-form"]').should('be.visible');
      cy.get('[data-cy="email-input"]').should('be.visible');
      cy.get('[data-cy="password-input"]').should('be.visible');
      cy.get('[data-cy="login-button"]').should('be.visible');
    });

    it('devrait afficher le logo NDORTEL', () => {
      cy.get('[data-cy="logo"]').should('be.visible');
    });

    it('devrait avoir le titre correct', () => {
      cy.title().should('contain', 'NDORTEL');
    });
  });

  // ----------------------------------------
  // Tests de connexion réussie
  // ----------------------------------------
  describe('Connexion réussie', () => {
    it('devrait connecter un agent avec des credentials valides', () => {
      // Intercepter l'appel API
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          token: 'fake-jwt-token',
          user: {
            id: '1',
            email: 'agent@ndortel.sn',
            role: 'agent',
            fullName: 'Agent Test'
          }
        }
      }).as('loginRequest');

      // Remplir le formulaire
      cy.get('[data-cy="email-input"]').type('agent@ndortel.sn');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();

      // Vérifier la requête
      cy.wait('@loginRequest');

      // Vérifier la redirection
      cy.url().should('include', '/dashboard');

      // Vérifier le stockage du token
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.eq('fake-jwt-token');
      });
    });

    it('devrait afficher le nom de l\'utilisateur après connexion', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          token: 'token',
          user: { id: '1', email: 'test@test.sn', role: 'agent', fullName: 'Jean Dupont' }
        }
      }).as('login');

      cy.get('[data-cy="email-input"]').type('test@test.sn');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();
      cy.wait('@login');

      cy.get('[data-cy="user-name"]').should('contain', 'Jean Dupont');
    });

    it('devrait rediriger vers le dashboard selon le rôle', () => {
      // Test pour un admin
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          token: 'admin-token',
          user: { id: '1', email: 'admin@ndortel.sn', role: 'admin', fullName: 'Admin' }
        }
      }).as('adminLogin');

      cy.get('[data-cy="email-input"]').type('admin@ndortel.sn');
      cy.get('[data-cy="password-input"]').type('adminpass123');
      cy.get('[data-cy="login-button"]').click();
      cy.wait('@adminLogin');

      // L'admin devrait voir le menu d'administration
      cy.get('[data-cy="admin-menu"]').should('be.visible');
    });
  });

  // ----------------------------------------
  // Tests de connexion échouée
  // ----------------------------------------
  describe('Connexion échouée', () => {
    it('devrait afficher une erreur pour des credentials invalides', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 401,
        body: { error: 'Email ou mot de passe incorrect' }
      }).as('failedLogin');

      cy.get('[data-cy="email-input"]').type('wrong@test.sn');
      cy.get('[data-cy="password-input"]').type('wrongpassword');
      cy.get('[data-cy="login-button"]').click();

      cy.wait('@failedLogin');

      // Vérifier le message d'erreur
      cy.get('[data-cy="error-message"]')
        .should('be.visible')
        .and('contain', 'incorrect');

      // Vérifier qu'on reste sur la page de login
      cy.url().should('include', '/login');
    });

    it('devrait afficher une erreur pour un compte désactivé', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 403,
        body: { error: 'Compte désactivé' }
      }).as('disabledLogin');

      cy.get('[data-cy="email-input"]').type('disabled@test.sn');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();

      cy.wait('@disabledLogin');

      cy.get('[data-cy="error-message"]')
        .should('contain', 'désactivé');
    });

    it('devrait gérer les erreurs serveur', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 500,
        body: { error: 'Erreur serveur' }
      }).as('serverError');

      cy.get('[data-cy="email-input"]').type('test@test.sn');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();

      cy.wait('@serverError');

      cy.get('[data-cy="error-message"]')
        .should('be.visible');
    });
  });

  // ----------------------------------------
  // Tests de validation du formulaire
  // ----------------------------------------
  describe('Validation du formulaire', () => {
    it('devrait afficher une erreur pour un email invalide', () => {
      cy.get('[data-cy="email-input"]').type('invalid-email');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();

      cy.get('[data-cy="email-error"]')
        .should('be.visible')
        .and('contain', 'Email invalide');
    });

    it('devrait afficher une erreur pour un mot de passe trop court', () => {
      cy.get('[data-cy="email-input"]').type('test@test.sn');
      cy.get('[data-cy="password-input"]').type('1234567');
      cy.get('[data-cy="login-button"]').click();

      cy.get('[data-cy="password-error"]')
        .should('be.visible')
        .and('contain', 'trop court');
    });

    it('devrait désactiver le bouton pendant le chargement', () => {
      cy.intercept('POST', '**/api/auth/login', {
        delay: 1000,
        statusCode: 200,
        body: { token: 'token', user: {} }
      }).as('slowLogin');

      cy.get('[data-cy="email-input"]').type('test@test.sn');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();

      // Le bouton devrait être désactivé pendant le chargement
      cy.get('[data-cy="login-button"]').should('be.disabled');
    });
  });

  // ----------------------------------------
  // Tests de déconnexion
  // ----------------------------------------
  describe('Déconnexion', () => {
    beforeEach(() => {
      // Se connecter d'abord
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          token: 'test-token',
          user: { id: '1', email: 'test@test.sn', role: 'agent', fullName: 'Test' }
        }
      });

      cy.get('[data-cy="email-input"]').type('test@test.sn');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();
      cy.url().should('include', '/dashboard');
    });

    it('devrait déconnecter l\'utilisateur', () => {
      cy.get('[data-cy="user-menu"]').click();
      cy.get('[data-cy="logout-button"]').click();

      // Vérifier la redirection
      cy.url().should('include', '/login');

      // Vérifier que le token est supprimé
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });

    it('devrait empêcher l\'accès aux pages protégées après déconnexion', () => {
      cy.get('[data-cy="user-menu"]').click();
      cy.get('[data-cy="logout-button"]').click();

      // Essayer d'accéder au dashboard
      cy.visit('/dashboard');

      // Devrait être redirigé vers login
      cy.url().should('include', '/login');
    });
  });

  // ----------------------------------------
  // Tests de session expirée
  // ----------------------------------------
  describe('Session expirée', () => {
    it('devrait rediriger vers login si le token expire', () => {
      // Simuler un utilisateur connecté
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'expired-token');
      });

      // Intercepter une requête avec token expiré
      cy.intercept('GET', '**/api/**', {
        statusCode: 401,
        body: { error: 'Token expiré' }
      });

      cy.visit('/dashboard');

      // Devrait être redirigé vers login
      cy.url().should('include', '/login');

      // Devrait afficher un message
      cy.get('[data-cy="session-expired-message"]')
        .should('be.visible');
    });
  });
});