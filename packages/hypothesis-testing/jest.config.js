const tsJestPath = require.resolve("ts-jest");
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/src/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [tsJestPath, { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  forceExit: true,
  detectOpenHandles: true,
  collectCoverage: false,
};