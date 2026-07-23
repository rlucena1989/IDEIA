import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa flow.
 * @param module - Valor module.
 * @param options - Valor options.
 */
export function errorFlow(module: string, options: GeneratorOptions): void {
  const vars = buildVars(module);
  const base = 'src/{{name_kebab}}/errors';
  const files: FileEntry[] = [
    {
      path: `${base}/{{Name}}ErrorCodes.ts`,
      content: `export const {{NAME}}_ERROR_CODES = {
  NOT_FOUND: '{{NAME}}_NOT_FOUND',
  INVALID_INPUT: '{{NAME}}_INVALID_INPUT',
  OPERATION_FAILED: '{{NAME}}_OPERATION_FAILED',
  UNAUTHORIZED: '{{NAME}}_UNAUTHORIZED',
  CONFLICT: '{{NAME}}_CONFLICT',
} as const;

export type {{Name}}ErrorCode = typeof {{NAME}}_ERROR_CODES[keyof typeof {{NAME}}_ERROR_CODES];
`,
    },
    {
      path: `${base}/{{Name}}Exceptions.ts`,
      content: `import { {{Name}}ErrorCode, {{NAME}}_ERROR_CODES } from './{{Name}}ErrorCodes';

export class {{Name}}Exception extends Error {
  constructor(
    public readonly code: {{Name}}ErrorCode,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = '{{Name}}Exception';
  }
}

export class {{Name}}NotFoundException extends {{Name}}Exception {
  constructor(id: string) {
    super({{NAME}}_ERROR_CODES.NOT_FOUND, \`{{Name}} not found: \${id}\`, 404);
  }
}

export class {{Name}}InvalidInputException extends {{Name}}Exception {
  constructor(details: string) {
    super({{NAME}}_ERROR_CODES.INVALID_INPUT, \`Invalid input: \${details}\`, 400);
  }
}
`,
    },
    {
      path: `${base}/{{Name}}ErrorHandler.ts`,
      content: `import { Request, Response, NextFunction } from 'express';
import { {{Name}}Exception } from './{{Name}}Exceptions';

export function {{camel}}ErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof {{Name}}Exception) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
`,
    },
    {
      path: `${base}/__tests__/{{Name}}Exceptions.test.ts`,
      content: `import { {{Name}}NotFoundException } from '../{{Name}}Exceptions';

describe('{{Name}}Exceptions', () => {
  it('should create not found exception', () => {
    const ex = new {{Name}}NotFoundException('test-id');
    expect(ex.statusCode).toBe(404);
    expect(ex.message).toContain('test-id');
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Error Flow: ${module}`, result, options.dryRun);
}
