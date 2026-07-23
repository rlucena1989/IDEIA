module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.e2e.test.ts', '**/e2e/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/lib/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.base.json' }],
  },
  testTimeout: 60000,
  forceExit: true,
  detectOpenHandles: true,
};
