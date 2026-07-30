module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
  moduleNameMapper: {
    '^@ideia/core-contributions$': '<rootDir>/src/__mocks__/@ideia/core-contributions.ts',
  },
};
