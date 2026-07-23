# @ideia/memory-store

AI-Devkit Memory Store — persistência de sessão, contexto, decisões e records unificados.

## Installation

```bash
npm install @ideia/memory-store
```

## Usage

```typescript
import { MemoryStore } from '@ideia/memory-store';

const store = new MemoryStore({ namespace: 'sessions' });
await store.set('session-1', { context: 'fixing bug' });
const session = await store.get('session-1');
```
