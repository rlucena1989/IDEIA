const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/core-contributions$': path.resolve(__dirname, '../core-contributions/src'),
    '^@ideia/editor-core$': path.resolve(__dirname, '../editor-core/src'),
    '^@ideia/views-widgets$': path.resolve(__dirname, '../views-widgets/src'),
    '^@ideia/markers-output$': path.resolve(__dirname, '../markers-output/src'),
    '^@ideia/(.*)$': path.resolve(__dirname, '../$1/src'),
  },
};
