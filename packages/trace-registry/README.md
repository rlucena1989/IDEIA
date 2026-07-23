# @ideia/trace-registry

AI-Devkit Trace Registry — linking, graph traversal e path finding.

## Installation

```bash
npm install @ideia/trace-registry
```

## Usage

```typescript
import { TraceRegistry } from '@ideia/trace-registry';

const registry = new TraceRegistry();
registry.link('REQ-001', 'TASK-001', 'implements');
const path = registry.findPath('REQ-001', 'TEST-001');
```
