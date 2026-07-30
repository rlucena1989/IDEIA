const tsJestPath = require.resolve('ts-jest');
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [tsJestPath, { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@ideia/(.*)$': '<rootDir>/../../packages/$1/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  forceExit: true,
  detectOpenHandles: true,
};
