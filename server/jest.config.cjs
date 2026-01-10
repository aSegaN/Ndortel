// ============================================
// FICHIER: jest.config.cjs
// CHEMIN COMPLET: server/jest.config.cjs
// DESCRIPTION: Configuration Jest (CommonJS pour "type": "module")
// VERSION: 2.1.0 - ARCH-004 FINAL
// ============================================

/** @type {import('jest').Config} */
module.exports = {
  // Environnement Node.js
  testEnvironment: 'node',
  
  // Preset TypeScript
  preset: 'ts-jest',
  
  // Configuration ts-jest avec tsconfig dédié
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: true
    }]
  },
  
  // Support ES Modules
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Racine des tests
  roots: ['<rootDir>/src/__tests__'],
  
  // Pattern des fichiers de test
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // Fichiers à ignorer
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/types/',
    'setup.ts'
  ],
  
  // Setup avant les tests
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  
  // Couverture
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/types/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  
  // Timeout
  testTimeout: 15000,
  
  // Verbose
  verbose: true,
  
  // Ignorer les modules Cypress
  modulePathIgnorePatterns: [
    '<rootDir>/../node_modules/cypress',
    '<rootDir>/../client/cypress',
    'cypress'
  ],
  
  // Clear mocks automatiquement
  clearMocks: true,
  
  // Restore mocks après chaque test
  restoreMocks: true
};
