const path = require('path');
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/core-contributions$': path.resolve(__dirname, '../core-contributions/src'),
  },
};
