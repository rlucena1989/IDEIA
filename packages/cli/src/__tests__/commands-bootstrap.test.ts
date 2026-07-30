import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

jest.mock('../runtime/bootstrap-engine', () => ({
  bootstrapProject: jest.fn(() => ({
    summary: 'Project created',
    created: ['src/index.ts', 'README.md'],
    skipped: [],
    errors: [],
  })),
  generateModuleDocs: jest.fn(() => '# Module Documentation\n\n...'),
  generatePromptPack: jest.fn(() => '# Prompt Pack\n\n...'),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => 'content'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('createBootstrapCommand', () => {
  it('returns a Command object with name bootstrap', () => {
    const { createBootstrapCommand } = require('../commands/bootstrap');
    const cmd = createBootstrapCommand();
    expect(cmd.name()).toBe('bootstrap');
  });

  it('has description', () => {
    const { createBootstrapCommand } = require('../commands/bootstrap');
    const cmd = createBootstrapCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has init subcommand', () => {
    const { createBootstrapCommand } = require('../commands/bootstrap');
    const cmd = createBootstrapCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('init');
  });

  it('has docs subcommand', () => {
    const { createBootstrapCommand } = require('../commands/bootstrap');
    const cmd = createBootstrapCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('docs');
  });

  it('has prompt-pack subcommand', () => {
    const { createBootstrapCommand } = require('../commands/bootstrap');
    const cmd = createBootstrapCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('prompt-pack');
  });

  it('init subcommand has --features option', () => {
    const { createBootstrapCommand } = require('../commands/bootstrap');
    const cmd = createBootstrapCommand();
    const init = cmd.commands.find((c: { name: () => string }) => c.name() === 'init');
    expect(init.options.some((o: { attributeName: () => string }) => o.attributeName() === 'features')).toBe(true);
  });

  it('init subcommand has --dry-run option', () => {
    const { createBootstrapCommand } = require('../commands/bootstrap');
    const cmd = createBootstrapCommand();
    const init = cmd.commands.find((c: { name: () => string }) => c.name() === 'init');
    expect(init.options.some((o: { attributeName: () => string }) => o.attributeName() === 'dryRun')).toBe(true);
  });

  it('docs subcommand has --save option', () => {
    const { createBootstrapCommand } = require('../commands/bootstrap');
    const cmd = createBootstrapCommand();
    const docs = cmd.commands.find((c: { name: () => string }) => c.name() === 'docs');
    expect(docs.options.some((o: { attributeName: () => string }) => o.attributeName() === 'save')).toBe(true);
  });
});
