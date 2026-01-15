// ============================================
// FICHIER: certificates.cy.ts
// CHEMIN COMPLET: client/cypress/e2e/certificates.cy.ts
// DESCRIPTION: Tests E2E de gestion des certificats de naissance
// VERSION: 1.0.0 - ARCH-004
// ============================================

describe('Gestion des Certificats de Naissance', () => {
    // ----------------------------------------
    // Setup
    // ----------------------------------------
    beforeEach(() => {
        // Mock de l'authentification
        cy.intercept('POST', '**/api/auth/login', {
            statusCode: 200,
            body: {
                token: 'test-token',
                user: { id: '1', email: 'agent@ndortel.sn', role: 'agent', fullName: 'Agent Test' }
            }
        });

        // Se connecter
        cy.visit('/login');
        cy.get('[data-cy="email-input"]').type('agent@ndortel.sn');
        cy.get('[data-cy="password-input"]').type('password123');
        cy.get('[data-cy="login-button"]').click();
        cy.url().should('include', '/dashboard');
    });

    // ----------------------------------------
    // Tests de navigation
    // ----------------------------------------
    describe('Navigation', () => {
        it('devrait accéder à la page de création de certificat', () => {
            cy.get('[data-cy="new-certificate-button"]').click();
            cy.url().should('include', '/certificates/new');
            cy.get('[data-cy="certificate-form"]').should('be.visible');
        });

        it('devrait accéder à la liste des certificats', () => {
            cy.intercept('GET', '**/api/certificates*', {
                statusCode: 200,
                body: { certificates: [], total: 0 }
            });

            cy.get('[data-cy="certificates-menu"]').click();
            cy.url().should('include', '/certificates');
        });
    });

    // ----------------------------------------
    // Tests de création de certificat
    // ----------------------------------------
    describe('Création de certificat', () => {
        beforeEach(() => {
            cy.get('[data-cy="new-certificate-button"]').click();
        });

        it('devrait créer un certificat avec les données minimales', () => {
            // Mock de la création
            cy.intercept('POST', '**/api/certificates', {
                statusCode: 201,
                body: {
                    id: 'cert-123',
                    registrationNumber: 'DN-2025-00001',
                    status: 'draft'
                }
            }).as('createCertificate');

            // Remplir le formulaire minimal
            cy.get('[data-cy="child-lastname"]').type('Diallo');
            cy.get('[data-cy="child-firstname"]').type('Amadou');
            cy.get('[data-cy="gender-M"]').click();
            cy.get('[data-cy="birth-date"]').type('2025-01-15');
            cy.get('[data-cy="birth-place"]').type('Dakar');
            cy.get('[data-cy="mother-lastname"]').type('Ndiaye');
            cy.get('[data-cy="mother-firstname"]').type('Fatou');

            // Soumettre
            cy.get('[data-cy="submit-button"]').click();

            cy.wait('@createCertificate');

            // Vérifier le succès
            cy.checkToast('Certificat créé', 'success');
        });

        it('devrait créer un certificat complet avec toutes les données', () => {
            cy.intercept('POST', '**/api/certificates', {
                statusCode: 201,
                body: { id: 'cert-456', registrationNumber: 'DN-2025-00002' }
            }).as('createFull');

            // Données de l'enfant
            cy.get('[data-cy="child-lastname"]').type('Ba');
            cy.get('[data-cy="child-firstname"]').type('Mariama');
            cy.get('[data-cy="gender-F"]').click();
            cy.get('[data-cy="birth-date"]').type('2025-01-20');
            cy.get('[data-cy="birth-time"]').type('14:30');
            cy.get('[data-cy="birth-place"]').type('Hôpital Principal de Dakar');

            // Données du père
            cy.get('[data-cy="father-lastname"]').type('Ba');
            cy.get('[data-cy="father-firstname"]').type('Mamadou');
            cy.get('[data-cy="father-cni"]').type('1234567890123');
            cy.get('[data-cy="father-phone"]').type('771234567');

            // Données de la mère
            cy.get('[data-cy="mother-lastname"]').type('Sow');
            cy.get('[data-cy="mother-firstname"]').type('Aïssatou');
            cy.get('[data-cy="mother-cni"]').type('2987654321098');
            cy.get('[data-cy="mother-phone"]').type('781234567');

            cy.get('[data-cy="submit-button"]').click();
            cy.wait('@createFull');

            cy.checkToast('Certificat créé', 'success');
        });

        it('devrait afficher des erreurs de validation', () => {
            // Soumettre sans remplir
            cy.get('[data-cy="submit-button"]').click();

            // Vérifier les erreurs
            cy.get('[data-cy="child-lastname-error"]').should('be.visible');
            cy.get('[data-cy="child-firstname-error"]').should('be.visible');
            cy.get('[data-cy="birth-date-error"]').should('be.visible');
            cy.get('[data-cy="mother-lastname-error"]').should('be.visible');
        });

        it('devrait valider le format du numéro CNI', () => {
            cy.get('[data-cy="father-cni"]').type('invalid-cni');
            cy.get('[data-cy="father-cni"]').blur();

            cy.get('[data-cy="father-cni-error"]')
                .should('be.visible')
                .and('contain', 'CNI invalide');
        });

        it('devrait valider le format du téléphone', () => {
            cy.get('[data-cy="father-phone"]').type('123456');
            cy.get('[data-cy="father-phone"]').blur();

            cy.get('[data-cy="father-phone-error"]')
                .should('be.visible')
                .and('contain', 'téléphone');
        });

        it('devrait empêcher les dates de naissance futures', () => {
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 1);
            const futureDateStr = futureDate.toISOString().split('T')[0];

            cy.get('[data-cy="birth-date"]').type(futureDateStr);
            cy.get('[data-cy="birth-date"]').blur();

            cy.get('[data-cy="birth-date-error"]')
                .should('be.visible')
                .and('contain', 'invalide');
        });
    });

    // ----------------------------------------
    // Tests d'upload d'images
    // ----------------------------------------
    describe('Upload d\'images', () => {
        beforeEach(() => {
            cy.get('[data-cy="new-certificate-button"]').click();
        });

        it('devrait permettre d\'uploader la CNI du père', () => {
            cy.get('[data-cy="father-cni-upload"]').selectFile(
                'cypress/fixtures/cni-sample.jpg',
                { force: true }
            );

            cy.get('[data-cy="father-cni-preview"]').should('be.visible');
        });

        it('devrait permettre d\'uploader le bulletin hospitalier', () => {
            cy.get('[data-cy="hospital-certificate-upload"]').selectFile(
                'cypress/fixtures/hospital-cert.jpg',
                { force: true }
            );

            cy.get('[data-cy="hospital-certificate-preview"]').should('be.visible');
        });

        it('devrait rejeter les fichiers trop volumineux', () => {
            // Créer un fixture avec un fichier > limite
            cy.get('[data-cy="father-cni-upload"]').selectFile(
                'cypress/fixtures/large-file.jpg',
                { force: true }
            );

            cy.get('[data-cy="upload-error"]')
                .should('be.visible')
                .and('contain', 'taille');
        });

        it('devrait rejeter les formats non supportés', () => {
            cy.get('[data-cy="father-cni-upload"]').selectFile(
                'cypress/fixtures/document.pdf',
                { force: true }
            );

            cy.get('[data-cy="upload-error"]')
                .should('be.visible')
                .and('contain', 'format');
        });
    });

    // ----------------------------------------
    // Tests de la liste des certificats
    // ----------------------------------------
    describe('Liste des certificats', () => {
        const mockCertificates = [
            { id: '1', registrationNumber: 'DN-2025-00001', childName: 'Amadou Diallo', status: 'draft', createdAt: '2025-01-15' },
            { id: '2', registrationNumber: 'DN-2025-00002', childName: 'Fatou Ba', status: 'validated', createdAt: '2025-01-16' },
            { id: '3', registrationNumber: 'DN-2025-00003', childName: 'Moussa Sow', status: 'signed', createdAt: '2025-01-17' }
        ];

        beforeEach(() => {
            cy.intercept('GET', '**/api/certificates*', {
                statusCode: 200,
                body: { certificates: mockCertificates, total: 3 }
            }).as('getCertificates');

            cy.get('[data-cy="certificates-menu"]').click();
            cy.wait('@getCertificates');
        });

        it('devrait afficher la liste des certificats', () => {
            cy.get('[data-cy="certificate-row"]').should('have.length', 3);
        });

        it('devrait afficher les statuts avec les bonnes couleurs', () => {
            cy.get('[data-cy="status-draft"]').should('have.class', 'bg-yellow');
            cy.get('[data-cy="status-validated"]').should('have.class', 'bg-blue');
            cy.get('[data-cy="status-signed"]').should('have.class', 'bg-green');
        });

        it('devrait permettre de filtrer par statut', () => {
            cy.intercept('GET', '**/api/certificates*status=validated*', {
                statusCode: 200,
                body: { certificates: [mockCertificates[1]], total: 1 }
            }).as('filterValidated');

            cy.get('[data-cy="status-filter"]').select('validated');
            cy.wait('@filterValidated');

            cy.get('[data-cy="certificate-row"]').should('have.length', 1);
        });

        it('devrait permettre de rechercher par numéro', () => {
            cy.intercept('GET', '**/api/certificates*search=DN-2025-00001*', {
                statusCode: 200,
                body: { certificates: [mockCertificates[0]], total: 1 }
            }).as('searchCert');

            cy.get('[data-cy="search-input"]').type('DN-2025-00001');
            cy.wait('@searchCert');

            cy.get('[data-cy="certificate-row"]').should('have.length', 1);
        });

        it('devrait permettre de voir les détails d\'un certificat', () => {
            cy.intercept('GET', '**/api/certificates/1', {
                statusCode: 200,
                body: mockCertificates[0]
            });

            cy.get('[data-cy="certificate-row"]').first().click();
            cy.url().should('include', '/certificates/1');
        });
    });

    // ----------------------------------------
    // Tests de validation (rôle validateur)
    // ----------------------------------------
    describe('Validation de certificat', () => {
        beforeEach(() => {
            // Changer le rôle pour validateur
            cy.window().then((win) => {
                const user = JSON.parse(win.localStorage.getItem('user') || '{}');
                user.role = 'validateur';
                win.localStorage.setItem('user', JSON.stringify(user));
            });

            cy.intercept('GET', '**/api/certificates/1', {
                statusCode: 200,
                body: { id: '1', status: 'pending_validation', childName: 'Test Child' }
            });

            cy.visit('/certificates/1');
        });

        it('devrait permettre de valider un certificat', () => {
            cy.intercept('POST', '**/api/certificates/1/validate', {
                statusCode: 200,
                body: { status: 'validated' }
            }).as('validate');

            cy.get('[data-cy="validate-button"]').click();
            cy.get('[data-cy="confirm-dialog"]').should('be.visible');
            cy.get('[data-cy="confirm-yes"]').click();

            cy.wait('@validate');
            cy.checkToast('Certificat validé', 'success');
        });

        it('devrait permettre de rejeter un certificat avec motif', () => {
            cy.intercept('POST', '**/api/certificates/1/reject', {
                statusCode: 200,
                body: { status: 'rejected' }
            }).as('reject');

            cy.get('[data-cy="reject-button"]').click();
            cy.get('[data-cy="rejection-reason"]').type('Documents illisibles');
            cy.get('[data-cy="confirm-reject"]').click();

            cy.wait('@reject');
            cy.checkToast('Certificat rejeté', 'success');
        });
    });

    // ----------------------------------------
    // Tests d'impression
    // ----------------------------------------
    describe('Impression de certificat', () => {
        it('devrait générer un PDF du certificat', () => {
            cy.intercept('GET', '**/api/certificates/1', {
                statusCode: 200,
                body: { id: '1', status: 'signed', registrationNumber: 'DN-2025-00001' }
            });

            cy.intercept('GET', '**/api/certificates/1/pdf', {
                statusCode: 200,
                headers: { 'Content-Type': 'application/pdf' },
                body: new Blob()
            }).as('getPdf');

            cy.visit('/certificates/1');
            cy.get('[data-cy="print-button"]').click();

            cy.wait('@getPdf');
        });
    });
});