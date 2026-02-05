/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/server.ts',
        '!src/tests/**'
    ],
    coverageDirectory: 'coverage',
    verbose: true,
    clearMocks: true,
    resetMocks: true
};
