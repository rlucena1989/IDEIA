# Tutorial System — IDEIA

Interactive tutorials that guide users from zero to productive with the IDEIA platform.

## Architecture

```
TutorialSystem
├── Registry       — Catalog of all tutorials (CRUD, search, filtering)
├── Engine         — Session management, step execution, validation
├── Validator      — Step completion verification
├── Tracker        — Progress persistence (SQLite/in-memory)
└── Renderer       — Multi-format output (CLI, Markdown, JSON)
```

## Tutorials Available

| # | Name | Difficulty | Time | Prerequisites |
|---|------|-----------|------|---------------|
| 01 | Meu Primeiro Projeto | beginner | 10min | none |
| 02 | CRUD Completo | intermediate | 20min | 01 |
| 03 | Integracao com API Externa | intermediate | 20min | 02 |
| 04 | Deploy Local | intermediate | 15min | 02 |
| 05 | Adicionando Novo Agente | advanced | 25min | 02, 03 |
| 06 | Criando Context Pack Customizado | advanced | 25min | 05 |

## Usage

```typescript
import { TutorialRegistry, TutorialEngine, ProgressTracker, TutorialRenderer } from '@ideia/tutorial-system';
import { tutorialList } from '@ideia/tutorial-system/tutorials';

const registry = new TutorialRegistry();
tutorialList.forEach(t => registry.register(t));

const tracker = new ProgressTracker();
const engine = new TutorialEngine(registry, tracker);

const session = engine.start('01-primeiro-projeto');
const summary = engine.complete(session.sessionId);

const renderer = new TutorialRenderer();
console.log(renderer.renderSummary(summary, 'cli'));
```

## Storage

Progress is stored in-memory by default. For persistence, extend `ProgressTracker` with SQLite or any storage backend.
