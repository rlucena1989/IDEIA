module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@tauri-apps/api/core$': '<rootDir>/__mocks__/tauri-core.ts',
    '^@tauri-apps/plugin-.+$': '<rootDir>/__mocks__/tauri-plugin.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
