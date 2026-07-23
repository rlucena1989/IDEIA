# @ideia/audit-trail

AI-Devkit Audit Trail — log estruturado de eventos, decisões e ações.

## Installation

```bash
npm install @ideia/audit-trail
```

## Usage

```typescript
import { AuditTrail } from '@ideia/audit-trail';

const trail = new AuditTrail();
trail.log('decision', { action: 'deploy', risk: 'low' });
const entries = trail.query({ type: 'decision' });
```
