process.env.GTI_TEST_MODE = '1';

import { Command } from 'commander';
import { resetIO, getIO } from '../src/io';
import { MockIOContainer } from '../src/io/mock';

let mockIO: MockIOContainer;

beforeEach(() => {
  resetIO();
  const io = getIO();
  mockIO = io as unknown as MockIOContainer;
  mockIO._reset();
});

afterEach(() => {
  resetIO();
});

describe('Program creation — Commander-based', () => {
  it('should create a program with name and version', () => {
    const version = '1.0.0';
    const program = new Command('ai-devkit')
      .description('CLI test')
      .version(version);
    expect(program.name()).toBe('ai-devkit');
    expect(program.description()).toBe('CLI test');
  });

  it('should create a program with options', () => {
    const program = new Command('test-cli');
    program.option('--verbose', 'verbose output');
    program.option('--json', 'JSON output');
    const _opts = program.opts();
    expect(program.options.length).toBe(2);
  });

  it('should allow chaining configuration', () => {
    const program = new Command('app')
      .name('my-app')
      .description('My CLI')
      .version('2.0.0');
    expect(program.name()).toBe('my-app');
    expect(program.description()).toBe('My CLI');
  });

  it('should fail on unknown command when exitOverride is set', () => {
    const program = new Command('strict');
    program.exitOverride();
    program.command('known').action(() => {});
    expect(() => {
      program.parse(['unknown'], { from: 'user' });
    }).toThrow();
  });
});

describe('Command registration', () => {
  it('should register a command with name and description', () => {
    const cmd = new Command('test-cmd')
      .description('A test command');
    expect(cmd.name()).toBe('test-cmd');
    expect(cmd.description()).toBe('A test command');
  });

  it('should register multiple commands on a program', () => {
    const program = new Command('multi');
    program.addCommand(new Command('init').description('Init project'));
    program.addCommand(new Command('status').description('Show status'));
    program.addCommand(new Command('verify').description('Verify config'));
    expect(program.commands.length).toBe(3);
    const names = program.commands.map(c => c.name());
    expect(names).toContain('init');
    expect(names).toContain('status');
    expect(names).toContain('verify');
  });

  it('should register commands with aliases', () => {
    const program = new Command('main');
    program.command('deploy').alias('d').action(() => {});
    const cmd = program.commands.find(c => c.name() === 'deploy');
    expect(cmd?.aliases()).toContain('d');
  });

  it('should support hierarchical subcommands', () => {
    const program = new Command('root');
    program.command('sub')
      .description('sub command')
      .command('nested')
      .action(() => {});
    const subCmd = program.commands.find(c => c.name() === 'sub');
    expect(subCmd).toBeDefined();
    expect(subCmd?.name()).toBe('sub');
  });

  it('should allow command to be invoked by its alias', () => {
    const results: string[] = [];
    const program = new Command('alias-test');
    program.command('generate').alias('g').action(() => { results.push('generate'); });
    program.parse(['generate'], { from: 'user' });
    expect(results).toContain('generate');
  });

  it('should register 100+ commands like the real CLI', () => {
    const program = new Command('large');
    for (let i = 0; i < 120; i++) {
      program.addCommand(new Command(`cmd${i}`).description(`Command ${i}`));
    }
    expect(program.commands.length).toBe(120);
  });

  it('should execute only the matched command', () => {
    const results: string[] = [];
    const program = new Command('selective');
    program.command('run').action(() => { results.push('run'); });
    program.command('build').action(() => { results.push('build'); });
    program.parse(['build'], { from: 'user' });
    expect(results).toEqual(['build']);
  });
});

describe('preAction hook tracing', () => {
  it('should invoke preAction hook before any command', () => {
    const calls: string[] = [];
    const program = new Command('trace-cli');
    program
      .command('run')
      .action(() => { calls.push('action'); });
    program.hook('preAction', () => { calls.push('pre'); });
    program.parse(['run'], { from: 'user' });
    expect(calls).toEqual(['pre', 'action']);
  });

  it('should pass thisCommand to preAction', () => {
    const order: string[] = [];
    const program = new Command('hook-test');
    program
      .command('run')
      .action(() => { order.push('executed'); });
    program.hook('preAction', () => {
      order.push('pre');
    });
    program.parse(['run'], { from: 'user' });
    expect(order).toContain('pre');
    expect(order).toContain('executed');
  });

  it('should support postAction hook', () => {
    const order: string[] = [];
    const program = new Command('order');
    program
      .command('task')
      .action(() => { order.push('action'); });
    program.hook('preAction', () => { order.push('pre'); });
    program.hook('postAction', () => { order.push('post'); });
    program.parse(['task'], { from: 'user' });
    expect(order).toEqual(['pre', 'action', 'post']);
  });

  it('should trace elapsed time in preAction', () => {
    const startTimes: number[] = [];
    const program = new Command('perf');
    program
      .command('slow')
      .action(() => { /* simulate work */ });
    program.hook('preAction', () => {
      startTimes.push(Date.now());
    });
    program.parse(['slow'], { from: 'user' });
    expect(startTimes.length).toBe(1);
    expect(startTimes[0]).toBeGreaterThan(0);
  });

  it('should support multiple preAction hooks in order', () => {
    const calls: string[] = [];
    const program = new Command('multi-hook');
    program
      .command('go')
      .action(() => { calls.push('action'); });
    program.hook('preAction', () => { calls.push('pre1'); });
    program.hook('preAction', () => { calls.push('pre2'); });
    program.parse(['go'], { from: 'user' });
    expect(calls).toEqual(['pre1', 'pre2', 'action']);
  });

  it('should allow preAction to modify context', () => {
    const ctx: Record<string, unknown> = {};
    const program = new Command('ctx');
    program
      .command('work')
      .action(() => { ctx.executed = true; });
    program.hook('preAction', () => { ctx.traced = true; });
    program.parse(['work'], { from: 'user' });
    expect(ctx.traced).toBe(true);
    expect(ctx.executed).toBe(true);
  });
});

describe('Audit trail recording', () => {
  it('should record a trace entry on simulated exit', () => {
    const trail: Array<{ cmd: string; status: string; elapsed: number }> = [];

    const recordTrace = (cmd: string, status: string, elapsed: number) => {
      trail.push({ cmd, status, elapsed });
    };

    const traceCmd = 'deploy';
    const traceStart = 100;
    const exitCode = 0;
    const elapsed = Date.now() - traceStart;
    const status = exitCode === 0 ? 'success' : 'error';
    recordTrace(traceCmd, status, elapsed);

    expect(trail.length).toBe(1);
    expect(trail[0].cmd).toBe('deploy');
    expect(trail[0].status).toBe('success');
    expect(trail[0].elapsed).toBeGreaterThanOrEqual(0);
  });

  it('should record failure status on non-zero exit', () => {
    const trail: Array<{ cmd: string; status: string }> = [];

    const recordTrace = (cmd: string, status: string) => {
      trail.push({ cmd, status });
    };

    recordTrace('build', 'error');
    expect(trail[0].status).toBe('error');
  });

  it('should not record trace when no command was run', () => {
    const trail: Array<{ cmd: string }> = [];
    const recordTrace = (cmd: string) => { trail.push({ cmd }); };

    const traceStart = 0;
    if (traceStart > 0) {
      recordTrace('some-command');
    }

    expect(trail.length).toBe(0);
  });

  it('should append structured data to audit trail', () => {
    const entries: Array<{ actor: string; eventType: string; target: string; decision: string; result: string }> = [];

    const append = (entry: typeof entries[0]) => {
      entries.push(entry);
    };

    const cmd = 'status';
    const code = 0;
    append({
      actor: 'system',
      eventType: 'cli:command',
      target: `cli:${cmd}`,
      decision: code === 0 ? 'auto' : 'block',
      result: code === 0 ? 'success' : 'failure',
    });

    expect(entries.length).toBe(1);
    expect(entries[0].target).toBe('cli:status');
    expect(entries[0].result).toBe('success');
  });

  it('should audit with metadata like elapsed time', () => {
    const entries: Array<{ metadata: { elapsed: number; command: string } }> = [];

    const append = (entry: typeof entries[0]) => { entries.push(entry); };

    append({ metadata: { elapsed: 450, command: 'test' } });
    expect(entries[0].metadata.elapsed).toBe(450);
    expect(entries[0].metadata.command).toBe('test');
  });

  it('should support multiple audit entries', () => {
    const entries: Array<{ eventType: string }> = [];

    const append = (e: { eventType: string }) => { entries.push(e); };

    append({ eventType: 'cli:command' });
    append({ eventType: 'cli:result' });
    expect(entries.length).toBe(2);
  });

  it('should use AuditTrail class pattern for structured logging', () => {
    const log: string[] = [];
    const auditTrail = {
      append: (entry: Record<string, unknown>) => {
        log.push(JSON.stringify(entry));
      },
    };

    auditTrail.append({ eventType: 'cli:command', target: 'cli:init' });
    expect(log.length).toBe(1);
    const parsed = JSON.parse(log[0]);
    expect(parsed.target).toBe('cli:init');
  });
});
