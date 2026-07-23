# @ideia/a11y-scanner

AI-Devkit A11y Scanner — acessibilidade WCAG, scan de componentes.

## Installation

```bash
npm install @ideia/a11y-scanner
```

## Usage

```typescript
import { scanFile, scanProject } from '@ideia/a11y-scanner';

// Scan a single file
const results = scanFile('src/components/Button.tsx');
console.log(results.violations);

// Scan an entire project
const report = scanProject('src/');
console.log(report.score);
```
