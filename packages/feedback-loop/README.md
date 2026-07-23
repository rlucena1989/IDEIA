# @ideia/feedback-loop

Engineering Feedback Loop for IDEIA — orchestrator, pattern DB, scheduler.

## Features

- **FeedbackOrchestrator** — process events, resolve actions, manage pattern DB
- **LoopScheduler** — configurable interval tick emitter for feedback cycles
- **Zod Schemas** — typed validation for FeedbackEvent, FeedbackAction, PatternEntry, LoopConfig
- **Pattern Matching** — find known patterns by symptom text

## Usage

```typescript
import { FeedbackOrchestrator, LoopScheduler } from '@ideia/feedback-loop';

const orchestrator = new FeedbackOrchestrator();
const action = await orchestrator.onEvent({
  type: 'test_failure', source: 'ci', data: { test: 'login.test' }, severity: 'high', timestamp: Date.now(),
});

const scheduler = new LoopScheduler();
scheduler.start({ checkIntervalMs: 5000, autoFix: true, maxActions: 10 });
scheduler.on('tick', (now) => console.log('cycle at', now));
```

## API

### FeedbackOrchestrator
- `onEvent(event)` — process event, returns action
- `registerPattern(pattern)` — store known pattern
- `findPatterns(symptom)` — search pattern DB
- `getStats()` — event/action/pattern counts
- `processQueue()` — drain pending queue

### LoopScheduler
- `start(config)` — begin emitting ticks
- `stop()` — stop scheduler
- `isRunning()` — check status
- `'tick'` event — emitted each cycle

## Tests

12 tests covering orchestration, pattern matching, and scheduler lifecycle.
