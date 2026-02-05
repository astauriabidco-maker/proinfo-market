/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
    testTimeout: 30000, // 30 secondes pour les tests E2E
    verbose: true,
    forceExit: true,
    detectOpenHandles: true
};
