module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/core-contributions$': '<rootDir>/../core-contributions/src',
    '^@ideia/logger$': '<rootDir>/../logger/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
