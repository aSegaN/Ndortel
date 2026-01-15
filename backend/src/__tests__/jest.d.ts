// ============================================
// FICHIER: jest.d.ts
// CHEMIN COMPLET: server/src/__tests__/jest.d.ts
// DESCRIPTION: Override des types pour forcer Jest au lieu de Chai/Cypress
// VERSION: 1.0.0 - ARCH-004
// ============================================

/// <reference types="jest" />

// Forcer Jest expect au lieu de Chai
declare global {
    const expect: jest.Expect;
    const test: jest.It;
    const it: jest.It;
    const describe: jest.Describe;
    const beforeEach: jest.Lifecycle;
    const afterEach: jest.Lifecycle;
    const beforeAll: jest.Lifecycle;
    const afterAll: jest.Lifecycle;
}

export { };