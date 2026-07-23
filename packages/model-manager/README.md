# @ideia/model-manager

> Model Manager — model registration, evaluation, benchmark integration, model selection.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/model-manager
```

## Usage

```typescript
import { ModelManager, createModelManager, BenchmarkRunner, createBenchmarkRunner } from '@ideia/model-manager';

const manager = createModelManager();
manager.register({ name: 'gpt-4', provider: 'openai', category: 'chat' });
```

## API

- `ModelManager` — register, evaluate, and select LLM models
- `createModelManager()` — factory function
- `BenchmarkRunner` — run benchmarks against registered models
- `createBenchmarkRunner()` — benchmark factory
- Types: `ModelConfig`, `ModelProvider`, `ModelCategory`, `ModelEvaluation`, `ModelEntry`, `Benchmark`, `BenchmarkResult`, `BenchmarkRun`

## License

MIT
