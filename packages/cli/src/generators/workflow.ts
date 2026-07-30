import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa workflow.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function workflow(name: string, options: GeneratorOptions): void {
  const vars = buildVars(name);
  const base = 'src/workflows/{{name_kebab}}';
  const files: FileEntry[] = [
    {
      path: `${base}/{{Name}}Workflow.ts`,
      content: `export type {{Name}}Step = 'init' | 'validate' | 'process' | 'complete' | 'error';

export interface {{Name}}Transition {
  from: {{Name}}Step;
  to: {{Name}}Step;
  condition?: (context: Record<string, unknown>) => boolean;
}

export class {{Name}}Workflow {
  private currentStep: {{Name}}Step = 'init';
  private context: Record<string, unknown> = {};

  private readonly transitions: {{Name}}Transition[] = [
    { from: 'init', to: 'validate' },
    { from: 'validate', to: 'process' },
    { from: 'process', to: 'complete' },
    { from: '*', to: 'error' },
  ];

  get step(): {{Name}}Step { return this.currentStep; }

  async execute(input: Record<string, unknown>): Promise<{ success: boolean; step: {{Name}}Step }> {
    this.context = { ...input };
    this.currentStep = 'init';

    try {
      this.currentStep = 'validate';
      this.validate();

      this.currentStep = 'process';
      await this.process();

      this.currentStep = 'complete';
      return { success: true, step: this.currentStep };
    } catch {
      this.currentStep = 'error';
      return { success: false, step: this.currentStep };
    }
  }

  private validate(): void {
    // Implementar validacoes do workflow {{Name}} (ex: campos obrigatorios, regras de negocio, permissao)
  }

  private async process(): Promise<void> {
    // Implementar processamento principal do workflow {{Name}} (ex: transformacao, persistencia, notificacao)
  }
}
`,
    },
    {
      path: `${base}/__tests__/{{Name}}Workflow.test.ts`,
      content: `import { {{Name}}Workflow } from '../{{Name}}Workflow';

describe('{{Name}}Workflow', () => {
  const workflow = new {{Name}}Workflow();

  it('should complete successfully', async () => {
    const result = await workflow.execute({});
    expect(result.success).toBe(true);
    expect(result.step).toBe('complete');
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Workflow: ${name}`, result, options.dryRun);
}
