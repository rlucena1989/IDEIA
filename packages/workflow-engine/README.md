# @ideia/workflow-engine

AI-Devkit Workflow Engine — workflow, sprint manager, AI scheduler.

## Installation

```bash
npm install @ideia/workflow-engine
```

## Usage

```typescript
import { WorkflowEngine, SprintManager } from '@ideia/workflow-engine';

const engine = new WorkflowEngine();
await engine.createStep('code-review', { assignee: 'ai-agent' });

const sprint = new SprintManager();
await sprint.start({ duration: 14, goals: ['Feature X', 'Bug fixes'] });
```
