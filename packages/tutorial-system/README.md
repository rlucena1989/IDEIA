# @ideia/tutorial-system

Interactive Tutorial System for IDEIA — onboarding, progressive tutorials, gamification, and contextual help.

## Features

- **Tutorial Registry** — register, list, filter by difficulty/tags, search, and recommend next tutorials
- **Tutorial Engine** — execute step-by-step sessions with validation, hints, skip, scoring, and badges
- **Progress Tracker** — persist progress per user, completion rate, badges, and reset
- **Tutorial Renderer** — render tutorials and progress in CLI, Markdown, or JSON format
- **6 Built-in Tutorials** — from beginner (10 min) to advanced (25 min)

## Tutorials

| # | Name | Difficulty | Time |
|---|------|-----------|------|
| 1 | My First Project | beginner | 10min |
| 2 | Complete CRUD | intermediate | 20min |
| 3 | External API Integration | intermediate | 20min |
| 4 | Local Deploy | intermediate | 15min |
| 5 | Adding a New Agent | advanced | 25min |
| 6 | Custom Context Pack | advanced | 25min |

## Usage

```typescript
import { TutorialEngine, TutorialRegistry } from '@ideia/tutorial-system';

const registry = new TutorialRegistry();
registry.register(tutorial);

const engine = new TutorialEngine();
const session = engine.start(tutorial, { userId: 'user-1' });
const result = engine.executeStep(session.id, 'step-1', { answer: '...' });
```

## Tests

39 tests across 4 suites covering engine, registry, renderer, and tracker.
