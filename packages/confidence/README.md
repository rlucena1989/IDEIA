# @ideia/confidence

Centralized Confidence Engine for IDEIA — semantic classification, multi-provider consensus, scoring, and guardrails.

## Features

- **SemanticClassifier** — domain detection (6 domains), complexity analysis (simple/moderate/complex), keyword extraction
- **ConsensusEngine** — multi-provider voting with configurable thresholds, agreement calculation
- **ConfidenceScorer** — weighted scoring combining classification + consensus + custom factors
- **Zod Schemas** — typed validation for all confidence results
- **Guardrails** — built-in rules (min confidence, max variance, min votes)

## Usage

```typescript
import { ConfidenceScorer } from '@ideia/confidence';

const scorer = new ConfidenceScorer();

// Single input classification
const classification = scorer.classify('Build a React frontend');
console.log(classification.domain); // ['web-development']
console.log(classification.complexity); // 'simple'

// Multi-provider consensus
const result = await scorer.consensus('Should we refactor?', providers);
console.log(result.consensus, result.confidence);

// Combined scoring
const score = await scorer.score({ input: 'Implement auth with JWT' });
console.log(score.level); // 'high' | 'medium' | 'low'
```

## Tests

14 tests covering classifier, consensus engine, scorer, error handling, and edge cases.
