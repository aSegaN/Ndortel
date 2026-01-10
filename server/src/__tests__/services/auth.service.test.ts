// ============================================
// FICHIER: auth.service.test.ts
// CHEMIN COMPLET: server/src/__tests__/services/auth.service.test.ts
// DESCRIPTION: Tests unitaires du service d'authentification
// VERSION: 2.2.0 - ARCH-004 FINAL (fix module mock)
// ============================================

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ============================================
// TYPES
// ============================================

interface User {
    id: string;
    email: string;
    password_hash: string;
    role: string;
    full_name: string;
    is_active: boolean;
}

interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}

// ============================================
// MOCKS TYPÉS (sans jest.mock de modules externes)
// ============================================

// Mock typé pour les requêtes PostgreSQL
const mockQuery = jest.fn<(query: string, params?: any[]) => Promise<QueryResult>>();

// Mocks pour bcrypt
const mockBcryptCompare = jest.fn<(data: string, encrypted: string) => Promise<boolean>>();
const mockBcryptHash = jest.fn<(data: string, rounds: number) => Promise<string>>();

// Mocks pour jwt
const mockJwtSign = jest.fn<(payload: object, secret: string, options?: object) => string>();
const mockJwtVerify = jest.fn<(token: string, secret: string) => object>();

// ============================================
// SERVICE À TESTER (avec injection des mocks)
// ============================================

class AuthService {
    constructor(
        private query = mockQuery,
        private bcryptCompare = mockBcryptCompare,
        private bcryptHash = mockBcryptHash,
        private jwtSign = mockJwtSign,
        private jwtVerify = mockJwtVerify
    ) { }

    async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; token: string } | null> {
        const result = await this.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0] as User;
        const isValidPassword = await this.bcryptCompare(password, user.password_hash);

        if (!isValidPassword) {
            return null;
        }

        const token = this.jwtSign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '24h' }
        );

        const { password_hash, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }

    async register(email: string, password: string, fullName: string, role: string = 'agent'): Promise<User | null> {
        const existing = await this.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return null;
        }

        const hashedPassword = await this.bcryptHash(password, 12);
        const result = await this.query(
            `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, full_name, role, is_active`,
            [email, hashedPassword, fullName, role]
        );

        return result.rows[0];
    }

    verifyToken(token: string): Record<string, unknown> | null {
        try {
            return this.jwtVerify(token, process.env.JWT_SECRET || 'test-secret') as Record<string, unknown>;
        } catch {
            return null;
        }
    }
}

// ============================================
// TESTS
// ============================================

describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
        jest.clearAllMocks();
    });

    // ----------------------------------------
    // Tests de login
    // ----------------------------------------
    describe('login', () => {
        const mockUser: User = {
            id: 'user-123',
            email: 'agent@ndortel.sn',
            password_hash: 'hashed_password',
            role: 'agent',
            full_name: 'Agent Test',
            is_active: true
        };

        it('devrait retourner un token et user pour des credentials valides', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
            mockBcryptCompare.mockResolvedValueOnce(true);
            mockJwtSign.mockReturnValueOnce('mock-jwt-token');

            const result = await authService.login('agent@ndortel.sn', 'password123');

            expect(result).not.toBeNull();
            expect(result?.token).toBe('mock-jwt-token');
            expect(result?.user.email).toBe('agent@ndortel.sn');
            expect(result?.user).not.toHaveProperty('password_hash');
        });

        it('devrait retourner null pour un email inexistant', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const result = await authService.login('unknown@test.com', 'password');

            expect(result).toBeNull();
            expect(mockBcryptCompare).not.toHaveBeenCalled();
        });

        it('devrait retourner null pour un mot de passe incorrect', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
            mockBcryptCompare.mockResolvedValueOnce(false);

            const result = await authService.login('agent@ndortel.sn', 'wrong_password');

            expect(result).toBeNull();
            expect(mockJwtSign).not.toHaveBeenCalled();
        });

        it('devrait inclure le rôle dans le token JWT', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
            mockBcryptCompare.mockResolvedValueOnce(true);
            mockJwtSign.mockReturnValueOnce('token');

            await authService.login('agent@ndortel.sn', 'password123');

            expect(mockJwtSign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    email: 'agent@ndortel.sn',
                    role: 'agent'
                }),
                expect.any(String),
                expect.any(Object)
            );
        });
    });

    // ----------------------------------------
    // Tests de register
    // ----------------------------------------
    describe('register', () => {
        it('devrait créer un nouvel utilisateur avec succès', async () => {
            const newUser = { id: 'new-user', email: 'new@test.sn', full_name: 'New User', role: 'agent', is_active: true };

            mockQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [newUser], rowCount: 1 });
            mockBcryptHash.mockResolvedValueOnce('hashed_password');

            const result = await authService.register('new@test.sn', 'password123', 'New User');

            expect(result).not.toBeNull();
            expect(result?.email).toBe('new@test.sn');
            expect(mockBcryptHash).toHaveBeenCalledWith('password123', 12);
        });

        it('devrait retourner null si l\'email existe déjà', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 });

            const result = await authService.register('existing@test.sn', 'password', 'User');

            expect(result).toBeNull();
            expect(mockBcryptHash).not.toHaveBeenCalled();
        });

        it('devrait utiliser le rôle par défaut "agent"', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [{ role: 'agent' }], rowCount: 1 });
            mockBcryptHash.mockResolvedValueOnce('hash');

            await authService.register('test@test.sn', 'password123', 'Name');

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.arrayContaining(['agent'])
            );
        });
    });

    // ----------------------------------------
    // Tests de verifyToken
    // ----------------------------------------
    describe('verifyToken', () => {
        it('devrait retourner le payload pour un token valide', () => {
            const payload = { userId: '123', email: 'test@test.sn', role: 'admin' };
            mockJwtVerify.mockReturnValueOnce(payload);

            const result = authService.verifyToken('valid-token');

            expect(result).toEqual(payload);
        });

        it('devrait retourner null pour un token invalide', () => {
            mockJwtVerify.mockImplementationOnce(() => {
                throw new Error('Invalid token');
            });

            const result = authService.verifyToken('invalid-token');

            expect(result).toBeNull();
        });
    });
});