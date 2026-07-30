module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/(.*)$': '<rootDir>/../$1/src',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
};
