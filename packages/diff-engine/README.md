# @ideia/diff-engine

Unified diff engine — text, object, semantic, and git diff.

## Installation

```bash
npm install @ideia/diff-engine
```

## Usage

```typescript
import { textDiff, objectDiff } from '@ideia/diff-engine';

const changes = textDiff('old text', 'new text');
const objChanges = objectDiff({ a: 1 }, { a: 2, b: 3 });
```
