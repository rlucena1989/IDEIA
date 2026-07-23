# @ideia/agent-runtime

AI-Devkit Agent Runtime — interpretação de intenções, ciclo de ação, integração com LLM.

## Installation

```bash
npm install @ideia/agent-runtime
```

## Usage

```typescript
import { createSession, runAction } from '@ideia/agent-runtime';

const session = await createSession({ mode: 'balanced' });
const result = await runAction(session, 'analyze code');
console.log(result.output);
```
