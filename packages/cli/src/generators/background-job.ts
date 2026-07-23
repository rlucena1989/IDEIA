import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa job.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function backgroundJob(name: string, options: GeneratorOptions): void {
  const vars = buildVars(name);
  const base = 'src/jobs/{{name_kebab}}';
  const files: FileEntry[] = [
    {
      path: `${base}/{{Name}}Job.ts`,
      content: `export interface JobPayload {
  id: string;
  data: Record<string, unknown>;
  attempts?: number;
}

export interface JobResult {
  success: boolean;
  error?: string;
}

export class {{Name}}Job {
  private readonly maxRetries = 3;

  async execute(payload: JobPayload): Promise<JobResult> {
    try {
      console.log(\`[{{Name}}Job] Executing job \${payload.id}\`);
      // Implementar logica real do job (ex: processar payload, chamar APIs, persistir resultado)
      return { success: true };
    } catch (_error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(\`[{{Name}}Job] Failed: \${message}\`);
      return { success: false, error: message };
    }
  }

  async schedule(data: Record<string, unknown>, delayMs = 0): Promise<string> {
    const id = crypto.randomUUID();
    setTimeout(() => this.execute({ id, data }), delayMs);
    return id;
  }
}
`,
    },
    {
      path: `${base}/{{Name}}Queue.ts`,
      content: `import { {{Name}}Job, JobPayload } from './{{Name}}Job';

export class {{Name}}Queue {
  private queue: JobPayload[] = [];
  private processing = false;
  private job = new {{Name}}Job();

  enqueue(payload: JobPayload): void {
    this.queue.push(payload);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const payload = this.queue.shift()!;
      await this.job.execute(payload);
    }

    this.processing = false;
  }
}
`,
    },
    {
      path: `${base}/__tests__/{{Name}}Job.test.ts`,
      content: `import { {{Name}}Job } from '../{{Name}}Job';

describe('{{Name}}Job', () => {
  const job = new {{Name}}Job();

  it('should execute successfully', async () => {
    const result = await job.execute({ id: 'test-1', data: {} });
    expect(result.success).toBe(true);
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Background Job: ${name}`, result, options.dryRun);
}
