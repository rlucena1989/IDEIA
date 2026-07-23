# @ideia/prompt-security

AI-Devkit Prompt Security — sanitization, scan, rate limiter.

## Installation

```bash
npm install @ideia/prompt-security
```

## Usage

```typescript
import { sanitize, scan } from '@ideia/prompt-security';

const clean = sanitize('My API key is sk-1234');
console.log(clean); // masked

const issues = scan('SELECT * FROM users;');
console.log(issues); // [{ rule: 'sql-injection', severity: 'high' }]
```
