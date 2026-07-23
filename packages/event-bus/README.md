# @ideia/event-bus

AI-Devkit Event Bus — pub-sub com 16 tipos de evento.

## Installation

```bash
npm install @ideia/event-bus
```

## Usage

```typescript
import { EventBus } from '@ideia/event-bus';

const bus = new EventBus();
bus.on('task:completed', (data) => console.log(data));
bus.emit('task:completed', { id: 'TASK-001' });
```
