const tsJestPath = require.resolve('ts-jest');
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__contract__/**/*.test.ts', '**/*.contract.test.ts', '**/tests/contract/**/*.test.ts'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  transform: {
    '^.+\\.tsx?$': [tsJestPath, { tsconfig: 'tsconfig.base.json' }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '@ideia/(.*)': '<rootDir>/packages/$1/src',
  },
};
