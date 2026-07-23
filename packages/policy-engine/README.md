# @ideia/policy-engine

AI-Devkit Policy Engine — classificação e controle de ações (auto/ask/block).

## Installation

```bash
npm install @ideia/policy-engine
```

## Usage

```typescript
import { PolicyEngine } from '@ideia/policy-engine';

const engine = new PolicyEngine();
const result = engine.evaluate('delete-file', { path: '/tmp/test' });
console.log(result.action); // 'allow' | 'block' | 'ask'
```
