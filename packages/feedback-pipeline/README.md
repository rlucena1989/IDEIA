# @ideia/feedback-pipeline

AI-Devkit Feedback Pipeline — feedback → recomendações → memória.

## Installation

```bash
npm install @ideia/feedback-pipeline
```

## Usage

```typescript
import { FeedbackPipeline } from '@ideia/feedback-pipeline';

const pipeline = new FeedbackPipeline();
await pipeline.process({ type: 'suggestion', text: 'Add dark mode' });
const recommendations = await pipeline.getRecommendations();
```
