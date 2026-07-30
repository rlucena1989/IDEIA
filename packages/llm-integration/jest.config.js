module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/core-contributions$': '<rootDir>/src/__mocks__/ideia-core-contributions.ts',
    '^@ideia/theia-ai$': '<rootDir>/src/__mocks__/ideia-theia-ai.ts',
    '^@ideia/logger$': '<rootDir>/src/__mocks__/ideia-logger.ts',
  },
};
