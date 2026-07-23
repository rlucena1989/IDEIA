# @ideia/delivery-orchestrator

AI-Devkit Delivery Orchestrator — deploy, rollback, release pipeline, review gate.

## Installation

```bash
npm install @ideia/delivery-orchestrator
```

## Usage

```typescript
import { createRelease, deploy } from '@ideia/delivery-orchestrator';

const release = await createRelease({ version: '2.0.0' });
const result = await deploy(release, { environment: 'production' });
```
