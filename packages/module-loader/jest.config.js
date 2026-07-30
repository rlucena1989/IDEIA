module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/core-contributions$': '<rootDir>/../core-contributions/dist/index.js',
  },
};
