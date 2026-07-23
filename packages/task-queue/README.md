# @ideia/task-queue

Async task queue for IDEIA — in-process queue, retry with exponential backoff, priority ordering, EventBus integration.

## Features

- **Priority Queue** — tasks ordered by priority (low, medium, high, critical)
- **Retry with Backoff** — exponential backoff: 1s, 4s, 16s, 64s
- **Concurrency Control** — configurable max concurrent tasks
- **Event Emitter** — enqueued, started, completed, failed, retrying, cancelled events
- **Type-safe** — Zod schemas for tasks and results
- **Handler Registry** — register typed handlers per task type

## Usage

```typescript
import { TaskQueue } from '@ideia/task-queue';

const queue = new TaskQueue({ concurrency: 3 });
queue.registerHandler('email', async (task) => {
  console.log('Sending email:', task.payload);
  return { sent: true };
});

queue.start();
const id = await queue.enqueue({
  type: 'email',
  payload: { to: 'user@example.com' },
  priority: 'high',
});
```

## Events

- `enqueued` — task added to queue
- `started` — task execution began
- `completed` — task succeeded
- `failed` — task failed after all retries
- `retrying` — task failed and will retry
- `cancelled` — task was cancelled

## Tests

8 tests covering enqueue, events, retry, priority, cancel, handlers, and concurrency.
