# @ideia/agent-identity

AI-Devkit Agent Identity — RBAC roles, permissions, identity check.

## Installation

```bash
npm install @ideia/agent-identity
```

## Usage

```typescript
import { createRole, checkPermission } from '@ideia/agent-identity';

const role = createRole('admin', ['read', 'write', 'delete']);
const allowed = checkPermission('admin', 'write');
console.log(allowed); // true
```
