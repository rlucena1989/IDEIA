import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa pipeline.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function usecasePipeline(name: string, options: GeneratorOptions): void {
  const vars = buildVars(name);
  const targetDir = 'src/{{name_kebab}}/application/usecases/{{name_kebab}}';
  const files: FileEntry[] = [
    {
      path: `${targetDir}/{{Name}}Request.ts`,
      content: `export interface {{Name}}Request {
  readonly id?: string;
}

export class {{Name}}RequestDTO {
  constructor(public readonly data: {{Name}}Request) {}

  static from(body: Partial<{{Name}}Request>): {{Name}}RequestDTO {
    return new {{Name}}RequestDTO({ ...body });
  }
}
`,
    },
    {
      path: `${targetDir}/{{Name}}Response.ts`,
      content: `export interface {{Name}}Response {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class {{Name}}ResponseDTO {
  static ok(data?: unknown): {{Name}}Response {
    return { success: true, data };
  }

  static fail(error: string): {{Name}}Response {
    return { success: false, error };
  }
}
`,
    },
    {
      path: `${targetDir}/{{Name}}Handler.ts`,
      content: `import { {{Name}}Request } from './{{Name}}Request';
import { {{Name}}Response, {{Name}}ResponseDTO } from './{{Name}}Response';

export class {{Name}}Handler {
  async execute(request: {{Name}}Request): Promise<{{Name}}Response> {
    try {
      // Implementar logica do caso de uso {{name}}: regras de negocio, validacoes, chamadas a repositorios
      return {{Name}}ResponseDTO.ok({ request });
    } catch (_error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {{Name}}ResponseDTO.fail(message);
    }
  }
}
`,
    },
    {
      path: `${targetDir}/index.ts`,
      content: `export { {{Name}}Handler } from './{{Name}}Handler';
export type { {{Name}}Request } from './{{Name}}Request';
export type { {{Name}}Response } from './{{Name}}Response';
`,
    },
    {
      path: `${targetDir}/__tests__/{{Name}}Handler.test.ts`,
      content: `import { {{Name}}Handler } from '../{{Name}}Handler';

describe('{{Name}}Handler', () => {
  const handler = new {{Name}}Handler();

  it('should execute successfully', async () => {
    const result = await handler.execute({});
    expect(result.success).toBe(true);
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Use Case Pipeline: ${name}`, result, options.dryRun);
}
