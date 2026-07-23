import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa dto.
 * @param entity - Valor entity.
 * @param options - Valor options.
 */
export function dto(entity: string, options: GeneratorOptions): void {
  const vars = buildVars(entity);
  const base = 'src/{{name_kebab}}/api/dto';
  const files: FileEntry[] = [
    {
      path: `${base}/Create{{Name}}DTO.ts`,
      content: `import { z } from 'zod';

export const Create{{Name}}Schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type Create{{Name}}DTO = z.infer<typeof Create{{Name}}Schema>;

export function validateCreate{{Name}}(data: unknown): { success: boolean; data?: Create{{Name}}DTO; error?: string } {
  const result = Create{{Name}}Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors.map(e => e.message).join(', ') };
}
`,
    },
    {
      path: `${base}/Update{{Name}}DTO.ts`,
      content: `import { z } from 'zod';

export const Update{{Name}}Schema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type Update{{Name}}DTO = z.infer<typeof Update{{Name}}Schema>;

export function validateUpdate{{Name}}(data: unknown): { success: boolean; data?: Update{{Name}}DTO; error?: string } {
  const result = Update{{Name}}Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors.map(e => e.message).join(', ') };
}
`,
    },
    {
      path: `${base}/{{Name}}ResponseDTO.ts`,
      content: `export interface {{Name}}ResponseDTO {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
`,
    },
    {
      path: `${base}/__tests__/{{Name}}DTO.test.ts`,
      content: `import { validateCreate{{Name}}, validateUpdate{{Name}} } from '../Create{{Name}}DTO';

describe('{{Name}} DTOs', () => {
  it('should validate create DTO', () => {
    const result = validateCreate{{Name}}({ name: 'Test' });
    expect(result.success).toBe(true);
  });

  it('should reject empty create DTO', () => {
    const result = validateCreate{{Name}}({});
    expect(result.success).toBe(false);
  });

  it('should validate update DTO', () => {
    const result = validateUpdate{{Name}}({ name: 'Updated' });
    expect(result.success).toBe(true);
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`DTO: ${entity}`, result, options.dryRun);
}
