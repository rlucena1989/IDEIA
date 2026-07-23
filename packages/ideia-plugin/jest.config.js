module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
  moduleNameMapper: {
    '@theia/core/lib/browser': '<rootDir>/src/__mocks__/theia-mock.ts',
    '@theia/markers/lib/browser/marker-manager': '<rootDir>/src/__mocks__/theia-mock.ts',
    '@theia/(.*)': '<rootDir>/src/__mocks__/theia-mock.ts',
  },
};
