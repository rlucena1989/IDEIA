module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '^@ideia/core-contributions$': '<rootDir>/../core-contributions/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  forceExit: true,
  detectOpenHandles: true,
};
