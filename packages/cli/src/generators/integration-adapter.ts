import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa adapter.
 * @param source - Valor source.
 * @param options - Valor options.
 */
export function integrationAdapter(source: string, options: GeneratorOptions): void {
  const vars = buildVars(source);
  const base = 'src/integrations/{{name_kebab}}';
  const files: FileEntry[] = [
    {
      path: `${base}/{{Name}}Adapter.ts`,
      content: `export interface {{Name}}Config {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export class {{Name}}Adapter {
  private readonly config: {{Name}}Config;

  constructor(config: {{Name}}Config) {
    this.config = config;
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = \`\${this.config.baseUrl}\${path}\`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: \`Bearer \${this.config.apiKey}\` } : {}),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(\`{{Name}} API error: \${response.status} \${response.statusText}\`);
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
`,
    },
    {
      path: `${base}/{{Name}}Adapter.test.ts`,
      content: `import { {{Name}}Adapter } from './{{Name}}Adapter';

describe('{{Name}}Adapter', () => {
  const adapter = new {{Name}}Adapter({ baseUrl: 'https://api.example.com' });

  it('should be instantiated', () => {
    expect(adapter).toBeDefined();
  });
});
`,
    },
    {
      path: `${base}/index.ts`,
      content: `export { {{Name}}Adapter } from './{{Name}}Adapter';
export type { {{Name}}Config } from './{{Name}}Adapter';
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Integration Adapter: ${source}`, result, options.dryRun);
}
