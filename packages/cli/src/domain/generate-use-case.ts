import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
import type { IOContainer } from '../io/interfaces';
import { getIO } from '../io';
import { GenerateRequestSchema, type GenerateRequest } from '../contracts/domain-schemas';
const logger = createLogger('generate-use-case');

function validateGenerateRequest(input: unknown): GenerateRequest {
  const parsed = GenerateRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid generate request: ${parsed.error.message}`);
  }
  return parsed.data;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateOutput {
  template: string;
  name: string;
  files: GeneratedFile[];
  outputDir: string;
}

const TEMPLATE_PATHS: Record<string, string> = {
  'use-case': 'src/domain',
  'command': 'src/commands',
  'service': 'src/domain',
  'adapter': 'src/adapters',
  'schema': 'src/contracts',
  'test': '__tests__',
};

export class GenerateUseCase {
  private io: IOContainer;

  constructor() {
    this.io = getIO();
  }

  execute(template: string, name: string, options?: Partial<GenerateRequest>): CliCommandResult<GenerateOutput> {
    try {
      const config = validateGenerateRequest({ template, name, ...options });
      const cwd = this.io.fs.cwd();
      const outputDir = config.outputDir || cwd + '/' + (TEMPLATE_PATHS[config.template] || 'src');
      const files: GeneratedFile[] = [];

      if (this.io.fs.exists(outputDir + '/' + name + '.ts') && !config.force) {
        return failure(`File already exists: ${outputDir + '/' + name}.ts. Use --force to overwrite.`, 1) as CliCommandResult<GenerateOutput>;
      }

      const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '');
      const className = sanitizedName.charAt(0).toUpperCase() + sanitizedName.slice(1).replace(/[-_](.)/g, (_, c) => c.toUpperCase());
      const varName = sanitizedName.charAt(0).toLowerCase() + sanitizedName.slice(1).replace(/[-_](.)/g, (_, c) => c.toUpperCase());

      const content = this.renderTemplate(config.template, className, varName, config.variables || {});

      if (!config.dryRun) {
        this.io.fs.ensureDir(outputDir);
        this.io.fs.write(outputDir + '/' + sanitizedName + '.ts', content);
        files.push({ path: outputDir + '/' + sanitizedName + '.ts', content });
      }

      return success(`Generated ${config.template} "${className}" at ${outputDir}`, {
        template: config.template,
        name: sanitizedName,
        files,
        outputDir,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Generate failed: ${message}`, 1) as CliCommandResult<GenerateOutput>;
    }
  }

  private renderTemplate(template: string, className: string, varName: string, variables: Record<string, unknown>): string {
    const extra = Object.entries(variables)
      .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : JSON.stringify(v)};`)
      .join('\n');

    switch (template) {
      case 'use-case':
        return [
          `import type { CliCommandResult } from '../types/cli-result';`,
          `import { success, failure } from '../types/cli-result';`,
          `import { getIO } from '../io';`,
          ``,
          `export interface ${className}Output {`,
          extra ? `  message: string;\n${extra}` : `  message: string;`,
          `}`,
          ``,
          `export class ${className}UseCase {`,
          `  execute(input?: unknown): CliCommandResult<${className}Output> {`,
          `    try {`,
          `      return success('${className} executed', { message: 'ok' });`,
          `    } catch (err) {`,
          `      return failure(err instanceof Error ? err.message : String(err), 1);`,
          `    }`,
          `  }`,
          `}`,
          ``,
        ].join('\n');

      case 'command':
        return [
          `import { Command } from 'commander';`,
          `import type { CliCommandResult } from '../types/cli-result';`,
          `import { success } from '../types/cli-result';`,
          ``,
          `export function ${varName}Command(): Command {`,
          `  const cmd = new Command('${varName}')`,
          `    .description('${className} command');`,
          ``,
          `  cmd.action((): CliCommandResult => {`,
          `    return success('${className} command executed');`,
          `  });`,
          ``,
          `  return cmd;`,
          `}`,
          ``,
        ].join('\n');

      case 'service':
        return [
          `import { getIO } from '../io';`,
          `import type { IOContainer } from '../io/interfaces';`,
          ``,
          `export class ${className} {`,
          `  private io: IOContainer;`,
          ``,
          `  constructor() {`,
          `    this.io = getIO();`,
          `  }`,
          ``,
          `  execute(): string {`,
          `    return '${className} service executed';`,
          `  }`,
          `}`,
          ``,
        ].join('\n');

      default:
        return [
          `// Generated: ${className}`,
          `// Template: ${template}`,
          `export const ${varName} = '${className}';`,
          ``,
        ].join('\n');
    }
  }
}
