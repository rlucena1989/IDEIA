# @ideia/requirements-engine

AI-Devkit Requirements Engine — discover, list, trace e CRUD de requisitos.

## Installation

```bash
npm install @ideia/requirements-engine
```

## Usage

```typescript
import { RequirementsEngine } from '@ideia/requirements-engine';

const engine = new RequirementsEngine();
await engine.create({ id: 'REQ-002', title: 'Dark mode', status: 'draft' });
const all = await engine.list({ status: 'draft' });
```
