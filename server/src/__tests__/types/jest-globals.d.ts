// ============================================
// FICHIER: jest-globals.d.ts
// CHEMIN COMPLET: server/src/__tests__/types/jest-globals.d.ts
// DESCRIPTION: Déclarations globales Jest pour éviter le conflit avec Cypress/Chai
// VERSION: 1.0.0 - ARCH-004 FINAL
// ============================================

import type {
    Mock as JestMock,
    SpyInstance,
    Mocked,
    MockedFunction,
    MockedClass
} from 'jest-mock';

declare global {
    // ========================================
    // JEST NAMESPACE
    // ========================================
    namespace jest {
        type Mock<T = any, Y extends any[] = any> = JestMock<T, Y>;
        type SpyInstance<T = any, Y extends any[] = any> = SpyInstance<T, Y>;
        type Mocked<T> = Mocked<T>;
        type MockedFunction<T extends (...args: any[]) => any> = MockedFunction<T>;
        type MockedClass<T extends new (...args: any[]) => any> = MockedClass<T>;
    }

    // ========================================
    // JEST FUNCTIONS
    // ========================================
    const jest: typeof import('@jest/globals')['jest'];
    const expect: typeof import('@jest/globals')['expect'];
    const test: typeof import('@jest/globals')['test'];
    const it: typeof import('@jest/globals')['it'];
    const describe: typeof import('@jest/globals')['describe'];
    const beforeAll: typeof import('@jest/globals')['beforeAll'];
    const beforeEach: typeof import('@jest/globals')['beforeEach'];
    const afterAll: typeof import('@jest/globals')['afterAll'];
    const afterEach: typeof import('@jest/globals')['afterEach'];
}

// ========================================
// MATCHERS JEST (override Chai)
// ========================================
declare namespace jest {
    interface Matchers<R> {
        toBe(expected: any): R;
        toEqual(expected: any): R;
        toBeNull(): R;
        toBeDefined(): R;
        toBeUndefined(): R;
        toBeTruthy(): R;
        toBeFalsy(): R;
        toBeGreaterThan(expected: number): R;
        toBeGreaterThanOrEqual(expected: number): R;
        toBeLessThan(expected: number): R;
        toBeLessThanOrEqual(expected: number): R;
        toContain(expected: any): R;
        toHaveLength(expected: number): R;
        toHaveProperty(property: string, value?: any): R;
        toMatch(expected: string | RegExp): R;
        toMatchObject(expected: object): R;
        toThrow(expected?: string | Error | RegExp): R;
        toThrowError(expected?: string | Error | RegExp): R;
        toHaveBeenCalled(): R;
        toHaveBeenCalledTimes(expected: number): R;
        toHaveBeenCalledWith(...args: any[]): R;
        toHaveBeenLastCalledWith(...args: any[]): R;
        toHaveBeenNthCalledWith(n: number, ...args: any[]): R;
        toHaveReturned(): R;
        toHaveReturnedTimes(expected: number): R;
        toHaveReturnedWith(expected: any): R;
        toHaveLastReturnedWith(expected: any): R;
        toBeInstanceOf(expected: any): R;
        resolves: Matchers<Promise<R>>;
        rejects: Matchers<Promise<R>>;
        not: Matchers<R>;
    }

    interface Expect {
        <T = any>(actual: T): Matchers<void>;
        any(classType: any): any;
        anything(): any;
        arrayContaining(array: any[]): any;
        objectContaining(object: object): any;
        stringContaining(string: string): any;
        stringMatching(regexp: string | RegExp): any;
    }
}

export { };