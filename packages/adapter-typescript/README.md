# TypeScript Adapter

TypeScript code generator adapter for IDEIA.

## Capabilities

- `detect` - Detect TypeScript projects
- `init` - Scaffold new TypeScript project
- `generateEntity` - Generate entity with service and tests
- `runLint` - Run ESLint
- `runTests` - Run Jest tests
- `runBuild` - Build with TypeScript compiler
- `qualityGate` - Check project quality

## Usage

```typescript
import { createTypeScriptAdapter } from '@ideia/adapter-typescript';

const adapter = createTypeScriptAdapter();

// Detect TypeScript project
const isTsProject = adapter.detect('/path/to/project');

// Initialize new project
const result = await adapter.init('my-project', {
  generateExample: 'User'
});

// Generate entity
const entityPath = await adapter.generateEntity('Product');
```

## Generated Structure

```
my-project/
├── src/
│   ├── index.ts
│   ├── index.test.ts
│   └── entity/
│       ├── entity.ts
│       └── entity.test.ts
├── tsconfig.json
├── package.json
└── jest.config.js
```

## Features

- Full TypeScript project scaffolding
- Entity generation with service layer
- Automatic test generation
- ESLint configuration
- Jest test setup
- Quality gate checks
