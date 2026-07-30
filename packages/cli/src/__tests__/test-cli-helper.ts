import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('test-cli-helper');

export interface CliTestResult {
  command: string;
  output: string[];
  error: string[];
  duration: number;
  exitCode: number;
}

export interface CommandTestContext {
  program: Command;
  output: string[];
  errors: string[];
}

export function createTestProgram(commands: Array<() => Command>): CommandTestContext {
  const program = new Command();
  const ctx: CommandTestContext = { program, output: [], errors: [] };

  for (const cmd of commands) {
    program.addCommand(cmd());
  }

  // Capturar output
  const origStdout = process.stdout.write.bind(process.stdout);
  const origStderr = process.stderr.write.bind(process.stderr);

  process.stdout.write = (chunk: any) => { ctx.output.push(String(chunk)); return true; };
  process.stderr.write = (chunk: any) => { ctx.errors.push(String(chunk)); return true; };

  afterEach(() => {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
    ctx.output = [];
    ctx.errors = [];
  });

  return ctx;
}

export async function runCommand(program: Command, args: string[]): Promise<CliTestResult> {
  const start = Date.now();
  let exitCode = 0;

  try {
    await program.parseAsync(args, { from: 'user' });
  } catch (e) {
    exitCode = 1;
  }

  return {
    command: args.join(' '),
    output: [],
    error: [],
    duration: Date.now() - start,
    exitCode,
  };
}

export function expectCommand(cmd: Command): { toHaveOption: (flag: string) => void; toHaveDescription: (text: string) => void; toHaveName: (name: string) => void } {
  return {
    toHaveOption: (flag: string) => {
      const opt = cmd.options.find(o => o.long === flag || o.short === flag);
      expect(opt).toBeDefined();
    },
    toHaveDescription: (text: string) => {
      expect(cmd.description()).toContain(text);
    },
    toHaveName: (name: string) => {
      expect(cmd.name()).toBe(name);
    },
  };
}
