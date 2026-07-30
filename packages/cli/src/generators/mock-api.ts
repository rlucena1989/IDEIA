import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
const logger = createLogger('generators.mock-api');
import path from 'node:path';
import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa api.
 * @param spec - Valor spec.
 * @param options - Valor options.
 */
export function mockApi(spec: string, options: GeneratorOptions): void {
  const vars = buildVars(spec);
  const specPath = path.resolve(options.cwd || process.cwd(), spec);

  if (!fs.existsSync(specPath)) {
    console.error(`\nSpec nao encontrado: ${specPath}`);
    logger.info('Gerando mock generico baseado no nome...');
  }

  const files: FileEntry[] = [
    {
      path: 'src/mock/{{name_kebab}}-mock.ts',
      content: `import express from 'express';

const app = express();
app.use(express.json());
const PORT = process.env.MOCK_PORT || 3099;

// Mock endpoints for {{Name}}
const {{camel}}Data: Record<string, unknown>[] = [];

app.get('/api/{{name_kebab}}', (_req, res) => {
  res.json({ data: {{camel}}Data });
});

app.post('/api/{{name_kebab}}', (req, res) => {
  const item = { id: String({{camel}}Data.length + 1), ...req.body };
  {{camel}}Data.push(item);
  res.status(201).json({ data: item });
});

app.get('/api/{{name_kebab}}/:id', (req, res) => {
  const item = {{camel}}Data.find(d => (d as Record<string, unknown>).id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ data: item });
});

app.listen(PORT, () => {
  logger.info(\`Mock API {{Name}} running on port \${PORT}\`);
});
`,
    },
    {
      path: 'src/mock/{{name_kebab}}-mock.test.ts',
      content: `import request from 'supertest';

const BASE = process.env.MOCK_URL || 'http://localhost:3099';

describe('{{Name}} Mock API', () => {
  it('should respond to GET', async () => {
    try {
      const res = await fetch(\`\${BASE}/api/{{name_kebab}}\`);
      expect(res.status).toBe(200);
    } catch {
      console.warn('Mock server not running — start with: npx tsx src/mock/{{name_kebab}}-mock.ts');
    }
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Mock API: ${spec}`, result, options.dryRun);
}
