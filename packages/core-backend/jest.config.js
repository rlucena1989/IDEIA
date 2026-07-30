module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '@ideia/core-contributions': '<rootDir>/src/__mocks__/ideia-core-contributions.ts',
    '@ideia/backend-logging': '<rootDir>/src/__mocks__/ideia-backend-logging.ts',
  },
};
