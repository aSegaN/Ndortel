// ============================================
// FICHIER: setup.ts
// CHEMIN COMPLET: server/src/__tests__/setup.ts
// DESCRIPTION: Configuration globale des tests Jest (ESM compatible)
// VERSION: 2.1.0 - ARCH-004 FINAL
// ============================================

import { jest, afterEach, afterAll } from '@jest/globals';
import dotenv from 'dotenv';

// Charger les variables d'environnement de test
dotenv.config({ path: '.env.test' });

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars!';
process.env.STORAGE_ENCRYPTION_KEY = 'test-encryption-key-32-chars-ok!';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'ndortel_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Mock console pour réduire le bruit
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: jest.fn() as unknown as typeof console.log,
  debug: jest.fn() as unknown as typeof console.debug,
  info: jest.fn() as unknown as typeof console.info,
  warn: originalConsole.warn,
  error: originalConsole.error,
};

// Timeout global
jest.setTimeout(15000);

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Nettoyage après tous les tests
afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
});

// ============================================
// HELPERS POUR LES TESTS
// ============================================

export const mockRequest = (options: Record<string, unknown> = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...options
});

export const mockResponse = () => {
  const res: Record<string, unknown> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = jest.fn();
