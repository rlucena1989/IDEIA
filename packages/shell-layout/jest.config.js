const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/core-contributions$': path.join(__dirname, '../core-contributions/src/index.ts'),
    '^@ideia/views-widgets$': path.join(__dirname, '../views-widgets/src/index.ts'),
  },
};
