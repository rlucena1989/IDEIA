# @ideia/ide-integration

AI-Devkit IDE Integration — conecta event-bus, trace-registry e feedback-pipeline.

## Installation

```bash
npm install @ideia/ide-integration
```

## Usage

```typescript
import { createIDEIntegration } from '@ideia/ide-integration';

const ide = createIDEIntegration({
  eventBus: bus,
  traceRegistry: trace,
  feedbackPipeline: feedback,
});
await ide.start();
```
