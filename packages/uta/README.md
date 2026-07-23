# @ideia/uta

Unified Tool API for IDEIA — discovery registry, tool executor, audit layer, meta-endpoint.

## Features

- **DiscoveryRegistry** — register, list, search, and filter tools by category
- **ToolExecutor** — execute tools with audit logging and duration tracking
- **UTApi** — combined discover + execute + audit interface
- **Zod Schemas** — typed validation for tools, params, calls, results
- **Search** — find tools by name, description, or category

## Usage

```typescript
import { createUTApi, Tool } from '@ideia/uta';

const api = createUTApi();
api.registry.register(
  { id: 'code.gen', name: 'generateCode', description: 'Generate code from spec',
    category: 'code', params: [{ name: 'spec', type: 'string', required: true }] },
  async (params) => `// Generated code for: ${params.spec}`
);

const result = await api.execute({ toolId: 'code.gen', params: { spec: 'hello world' } });
console.log(result.data); // "// Generated code for: hello world"
```

## Tests

8 tests covering registration, execution, search, audit, error handling, and filtering.
