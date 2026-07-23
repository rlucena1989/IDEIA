const tsJestPath = require.resolve('ts-jest');
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/src/__tests__/**/*.test.ts', '**/tests/integration/**/*.test.ts', '**/tests/edge-cases/**/*.test.ts', '**/tests/performance/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/\\.test-gen/',
    'a11y-test-',
  ],
  transform: {
    '^.+\\.tsx?$': [tsJestPath, { tsconfig: 'tsconfig.base.json' }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  forceExit: true,
  detectOpenHandles: true,
};
