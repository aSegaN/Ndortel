// ============================================
// FICHIER: database.ts
// CHEMIN COMPLET: server/src/config/__mocks__/database.ts
// DESCRIPTION: Mock de la connexion PostgreSQL pour les tests
// VERSION: 1.0.0 - ARCH-004
// ============================================

export const pool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
};

export default pool;