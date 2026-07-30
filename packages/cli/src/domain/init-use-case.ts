import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
import type { IOContainer } from '../io/interfaces';
import { getIO } from '../io';
import { InitRequestSchema, type InitRequest } from '../contracts/domain-schemas';
const logger = createLogger('init-use-case');

function validateInitRequest(input: unknown): InitRequest {
  const parsed = InitRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid init request: ${parsed.error.message}`);
  }
  return parsed.data;
}

export interface InitOutput {
  projectName: string;
  projectPath: string;
  filesCreated: number;
  template: string;
  autonomyLevel: number;
}

export class InitUseCase {
  private io: IOContainer;

  constructor() {
    this.io = getIO();
  }

  execute(projectName: string, options?: Partial<InitRequest>): CliCommandResult<InitOutput> {
    try {
      const config = validateInitRequest({ projectName, ...options });
      const cwd = this.io.fs.cwd();
      const projectPath = cwd + '/' + config.projectName;

      if (this.io.fs.exists(projectPath) && !config.dryRun) {
        return failure(`Directory already exists: ${projectPath}`, 1) as CliCommandResult<InitOutput>;
      }

      if (!config.dryRun) {
        this.io.fs.mkDir(projectPath, true);
        const dirs = ['src', 'src/domain', 'src/io', 'src/commands', 'src/types', '.ai', 'docs'];
        for (const dir of dirs) {
          this.io.fs.mkDir(projectPath + '/' + dir, true);
        }

        const files: Record<string, string> = {
          'package.json': JSON.stringify({ name: config.projectName, version: '1.0.0', private: true, scripts: { build: 'tsc' } }, null, 2),
          'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', strict: true, outDir: 'dist' }, include: ['src'] }, null, 2),
          '.gitignore': 'node_modules\ndist\n.env',
          'README.md': `# ${config.projectName}\n\nIDEIA project generated with ${config.template} template.\n`,
        };

        for (const [file, content] of Object.entries(files)) {
          this.io.fs.write(projectPath + '/' + file, content);
        }

        if (config.gitInit) {
          this.io.shell.exec('git', ['init', projectPath]);
        }
      }

      const filesCreated = config.dryRun ? 0 : 5;
      return success(`Project "${config.projectName}" initialized with ${config.template} template`, {
        projectName: config.projectName,
        projectPath,
        filesCreated,
        template: config.template ?? 'minimal',
        autonomyLevel: config.autonomyLevel ?? 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Init failed: ${message}`, 1) as CliCommandResult<InitOutput>;
    }
  }
}
