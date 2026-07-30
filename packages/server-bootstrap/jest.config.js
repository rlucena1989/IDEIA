module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/core-backend$': '<rootDir>/../core-backend/dist/index.js',
    '^@ideia/backend-logging$': '<rootDir>/../backend-logging/dist/index.js',
    '^@ideia/core-contributions$': '<rootDir>/../core-contributions/dist/index.js',
  },
};
