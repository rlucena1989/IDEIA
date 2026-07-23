# @ideia/policy-gateway

AI-Devkit Policy Gateway — middleware de avaliação de políticas.

## Installation

```bash
npm install @ideia/policy-gateway
```

## Usage

```typescript
import { PolicyGateway } from '@ideia/policy-gateway';

const gateway = new PolicyGateway();
const decision = await gateway.evaluate({ action: 'deploy', resource: 'api' });
console.log(decision.allowed);
```
