const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/core-contributions$': path.join(__dirname, '../core-contributions/src/index.ts'),
    '^@ideia/editor-core$': path.join(__dirname, '../editor-core/src/index.ts'),
    '^@ideia/markers-output$': path.join(__dirname, '../markers-output/src/index.ts'),
  },
};
