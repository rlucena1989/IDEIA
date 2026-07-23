# @ideia/spec-generator

AI-Devkit Spec Generator — Gherkin parser, test stubs, spec generation.

## Installation

```bash
npm install @ideia/spec-generator
```

## Usage

```typescript
import { parseGherkin, generateTestStubs } from '@ideia/spec-generator';

const feature = parseGherkin('Feature: Login\nScenario: Valid login...');
const stubs = generateTestStubs(feature, { framework: 'jest' });
```
