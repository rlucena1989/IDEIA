const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ideia/checkpoint-engine$': path.resolve(__dirname, '../../packages/checkpoint-engine/src/index'),
    '^@ideia/agent-runtime$': path.resolve(__dirname, '../../packages/agent-runtime/src'),
    '^@ideia/logger$': path.resolve(__dirname, '../../packages/logger/src'),
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
    }],
  },
};
