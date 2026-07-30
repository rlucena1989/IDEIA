/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-deprecated-core',
      severity: 'error',
      comment: 'Deprecated package @ideia/core — use @ideia/contracts instead',
      from: { path: '^packages' },
      to: { path: 'packages/core/src' },
    },
    {
      name: 'no-circular-dependencies',
      severity: 'warn',
      comment: 'Circular dependencies increase coupling and make refactoring harder',
      from: {},
      to: { circular: true },
    },
    {
      name: 'cli-should-not-import-adapters',
      severity: 'error',
      comment: 'CLI should not directly import language adapters — use adapter registry',
      from: { path: 'packages/cli' },
      to: { path: 'packages/adapter-' },
    },
    {
      name: 'data-layer-only-import-domain',
      severity: 'warn',
      comment: 'Data layer should only depend on allowed packages',
      from: { path: 'packages/data-layer' },
      to: { pathNot: '^packages/(contracts|data-layer|event-bus|logger|cache|metrics-store)' },
    },
    {
      name: 'event-bus-only-import-core',
      severity: 'warn',
      comment: 'Event bus should only depend on allowed packages',
      from: { path: 'packages/event-bus' },
      to: { pathNot: '^packages/(event-bus|contracts|logger)' },
    },
    {
      name: 'no-cli-deep-imports-from-other-packages',
      severity: 'error',
      comment: 'CLI should not deep-import from other packages; use their index exports',
      from: { path: 'packages/cli' },
      to: { path: '^packages/(config-engine|event-bus|contracts|data-layer)/src/(?!index\\.)' },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment: 'Production code should not import dev dependencies',
      from: { pathNot: '\\.test\\.' },
      to: { dependencyTypes: ['npm-dev'] },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Files not imported by any other file may be dead code',
      from: { orphan: true, pathNot: 'packages/adapter-|packages/acp/|packages/mcp/|packages/sso/|/templates/|/scripts/|/types\\.' },
      to: {},
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg'],
    },
    exclude: {
      path: '\\.test\\.|\\.spec\\.|__tests__|__mocks__|node_modules|dist|\\.d\\.ts|jest\\.config',
    },
    includeOnly: '^packages',
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'default'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
