# @ideia/schema-registry

AI-Devkit Schema Registry — blueprint de schemas, validação e versionamento.

## Installation

```bash
npm install @ideia/schema-registry
```

## Usage

```typescript
import { SchemaRegistry } from '@ideia/schema-registry';

const registry = new SchemaRegistry();
const schema = registry.register('User', { name: 'string', email: 'string' });
const diff = registry.diff('User', schema, updatedSchema);
```
