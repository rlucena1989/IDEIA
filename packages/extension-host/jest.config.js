module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '@ideia/(.*)': '<rootDir>/../$1/src',
  },
  forceExit: true,
};
