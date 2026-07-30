import { DebugREPLCommand, DebugContext, REPLResult } from '../types';
import { createLogger } from '@ideia/logger';
import { RCAEngine } from '../rca/rca-engine';
import { FixSuggestionEngine } from '../fix/fix-engine';
import { ErrorNormalizer } from '../error-normalizer';
const logger = createLogger('ai-debug-repl');

export class AIDebugRepl {
  private commands: Map<string, DebugREPLCommand> = new Map();
  private rcaEngine: RCAEngine;
  private fixEngine: FixSuggestionEngine;
  private normalizer: ErrorNormalizer;

  constructor() {
    this.rcaEngine = new RCAEngine();
    this.fixEngine = new FixSuggestionEngine();
    this.normalizer = new ErrorNormalizer();
    this.registerDefaultCommands();
  }

  private registerDefaultCommands(): void {
    this.register({
      name: 'explain', description: 'Explain the current error in natural language',
      handler: async (_args, ctx) => {
        if (!ctx.error) return { type: 'error' as const, content: 'No error to explain' };
        return { type: 'text' as const, content: `Error: ${ctx.error.type}\nMessage: ${ctx.error.message}\nLocation: ${ctx.error.context.file}:${ctx.error.context.line}` };
      },
    });
    this.register({
      name: 'rootcause', description: 'Analyze root cause of the current error',
      handler: async (_args, ctx) => {
        if (!ctx.error) return { type: 'error' as const, content: 'No error to analyze' };
        const rca = await this.rcaEngine.analyze(ctx.error);
        return { type: 'text' as const, content: `Root Cause: ${rca.description}\nConfidence: ${Math.round(rca.confidence * 100)}%\nStrategy: ${rca.strategy}` };
      },
    });
    this.register({
      name: 'fix', description: 'Suggest a fix for the current error',
      handler: async (_args, ctx) => {
        if (!ctx.error) return { type: 'error' as const, content: 'No error to fix' };
        const rca = await this.rcaEngine.analyze(ctx.error);
        const fix = await this.fixEngine.generateFix(ctx.error, rca);
        return { type: 'diff' as const, content: fix.diff };
      },
    });
    this.register({
      name: 'help', description: 'List available debug commands',
      handler: async (_args, _ctx) => {
        const cmdList = Array.from(this.commands.values()).map(c => `  /${c.name.padEnd(15)} ${c.description}`).join('\n');
        return { type: 'text' as const, content: `Available commands:\n${cmdList}` };
      },
    });
  }

  register(command: DebugREPLCommand): void {
    this.commands.set(command.name, command);
  }

  async execute(input: string, context: DebugContext): Promise<REPLResult> {
    const match = input.match(/^\/(\w+)\s*(.*)$/);
    if (!match) return { type: 'text', content: 'Unknown command. Type /help for available commands.' };

    const [, name, args] = match;
    const command = this.commands.get(name);
    if (!command) return { type: 'error', content: `Unknown command: ${name}. Type /help.` };

    return command.handler(args.trim().split(/\s+/).filter(Boolean), context);
  }

  getCommands(): DebugREPLCommand[] {
    return Array.from(this.commands.values());
  }
}
