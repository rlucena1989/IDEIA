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
  testTimeout: 10000,
  transform: {
    '^.+\\.tsx?$': [tsJestPath, {
      tsconfig: 'tsconfig.base.json',
      isolatedModules: true,
      compilerOptions: {
        paths: {
          '@ideia/*': ['./packages/*/src']
        }
      }
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  forceExit: true,
  detectOpenHandles: true,
  collectCoverage: false,
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/node_modules/**',
  ],
  coverageReporters: ['lcov', 'text', 'text-summary', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 65,
      lines: 65,
      statements: 65,
    },
  },
};
