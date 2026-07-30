import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa validator.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function configValidator(name: string, options: GeneratorOptions): void {
  const vars = buildVars(name);
  const base = 'src/config';
  const files: FileEntry[] = [
    {
      path: `${base}/{{Name}}Config.ts`,
      content: `import { z } from 'zod';

const {{NAME}}ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type {{Name}}Config = z.infer<typeof {{NAME}}ConfigSchema>;

let cachedConfig: {{Name}}Config | null = null;

export function load{{Name}}Config(): {{Name}}Config {
  if (cachedConfig) return cachedConfig;

  const result = {{NAME}}ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.errors.map(e => \`\${e.path.join('.')}: \${e.message}\`);
    throw new Error(\`{{Name}} config validation failed:\\n\${missing.join('\\n')}\`);
  }

  cachedConfig = result.data;
  return result.data;
}

export function validate{{Name}}Config(env: Record<string, string | undefined>): { valid: boolean; errors: string[] } {
  const result = {{NAME}}ConfigSchema.safeParse(env);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: result.error.errors.map(e => \`\${e.path.join('.')}: \${e.message}\`) };
}
`,
    },
    {
      path: `${base}/__tests__/{{Name}}Config.test.ts`,
      content: `import { validate{{Name}}Config } from '../{{Name}}Config';

describe('{{Name}}Config', () => {
  it('should validate valid config', () => {
    const result = validate{{Name}}Config({
      DATABASE_URL: 'postgres://localhost:5432/db',
      API_KEY: 'test-key',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid config', () => {
    const result = validate{{Name}}Config({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Config Validator: ${name}`, result, options.dryRun);
}
