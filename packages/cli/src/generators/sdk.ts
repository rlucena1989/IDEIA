import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa sdk.
 * @param module - Valor module.
 * @param options - Valor options.
 */
export function sdk(module: string, options: GeneratorOptions): void {
  const vars = buildVars(module);
  const base = 'sdks/{{name_kebab}}';
  const files: FileEntry[] = [
    {
      path: `${base}/src/{{Name}}Client.ts`,
      content: `export interface {{Name}}ClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export class {{Name}}Client {
  private config: {{Name}}ClientConfig;

  constructor(config: {{Name}}ClientConfig) {
    this.config = config;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(\`\${this.config.baseUrl}\${path}\`, {
      headers: this.headers(),
    });
    return res.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(\`\${this.config.baseUrl}\${path}\`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return res.json();
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.config.apiKey ? { Authorization: \`Bearer \${this.config.apiKey}\` } : {}),
    };
  }
}
`,
    },
    {
      path: `${base}/package.json`,
      content: `{
  "name": "@ideia/{{name_kebab}}-sdk",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  }
}
`,
    },
    {
      path: `${base}/src/index.ts`,
      content: `export { {{Name}}Client } from './{{Name}}Client';
export type { {{Name}}ClientConfig } from './{{Name}}Client';
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`SDK: ${module}`, result, options.dryRun);
}
