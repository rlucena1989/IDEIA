module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/(.*)$': '<rootDir>/../../packages/$1/src',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
};
