import { complexityCommand } from '../complexity';

jest.mock('../../utils/output', () => ({ printLine: jest.fn(), printHeader: jest.fn(), printResult: jest.fn() }));
jest.mock('node:path', () => {
  const actual = jest.requireActual('node:path');
  return { ...actual, relative: jest.fn((f, t) => t) };
});

jest.mock('node:fs', () => ({ writeFileSync: jest.fn(), mkdirSync: jest.fn() }));
jest.mock('fs', () => ({ writeFileSync: jest.fn(), mkdirSync: jest.fn() }));

function getFs() { return require('node:fs'); }

const pj = (...args: string[]) => require('node:path').join(...args);
const scanDir = pj('test', 'dir');

describe('complexityCommand', () => {
  const { printLine } = require('../../utils/output');

  function makeCmd() { return complexityCommand(); }

  beforeEach(() => {
    jest.clearAllMocks();
    getFs().existsSync = jest.fn((p: string) => p.includes('exists'));
    getFs().readdirSync = jest.fn(() => []);
    getFs().readFileSync = jest.fn((p: string) => { throw new Error('ENOENT'); });
  });

  it('should have scan and report subcommands', () => {
    expect(makeCmd().commands.map(c => c.name())).toEqual(expect.arrayContaining(['scan', 'report']));
  });

  it('scan with non-existent dir should print error', async () => {
    const { printResult } = require('../../utils/output');
    getFs().existsSync = jest.fn(() => false);
    await makeCmd().parseAsync(['node', 'test', 'scan', '-d', scanDir]);
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('nao encontrado'));
  });

  it('scan should print results', async () => {
    getFs().existsSync = jest.fn(() => true);
    getFs().readdirSync = jest.fn(() => [{ name: 'simple.ts', isDirectory: () => false }]);
    getFs().readFileSync = jest.fn(() => 'function hello() { return "world"; }');
    await makeCmd().parseAsync(['node', 'test', 'scan', '-d', scanDir]);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Total funcoes'));
  });

  it('scan with complex code detects functions above threshold', async () => {
    getFs().existsSync = jest.fn(() => true);
    getFs().readdirSync = jest.fn(() => [{ name: 'complex.ts', isDirectory: () => false }]);
    getFs().readFileSync = jest.fn(() => 'function complexFunc(a, b) { if (a > 0) { return 1; } else if (b > 0) { return 2; } for (let i = 0; i < 10; i++) { if (i % 2 === 0) { continue; } } return 0; }');
    await makeCmd().parseAsync(['node', 'test', 'scan', '-d', scanDir, '-t', '3']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('complexFunc'));
  });

  it('scan --json should print JSON', async () => {
    getFs().existsSync = jest.fn(() => true);
    getFs().readdirSync = jest.fn(() => [{ name: 'file.ts', isDirectory: () => false }]);
    getFs().readFileSync = jest.fn(() => 'function foo() { return 1; }');
    await makeCmd().parseAsync(['node', 'test', 'scan', '-d', scanDir, '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('"functions"'));
  });

  it('scan with high threshold prints none found', async () => {
    getFs().existsSync = jest.fn(() => true);
    getFs().readdirSync = jest.fn(() => [{ name: 'simple.ts', isDirectory: () => false }]);
    getFs().readFileSync = jest.fn(() => 'function foo() { return 1; }');
    await makeCmd().parseAsync(['node', 'test', 'scan', '-d', scanDir, '-t', '99']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhuma funcao'));
  });

  it('report should generate CSV', async () => {
    getFs().existsSync = jest.fn(() => true);
    getFs().readdirSync = jest.fn(() => [{ name: 'func.ts', isDirectory: () => false }]);
    getFs().readFileSync = jest.fn(() => 'function test() { if (true) { return 1; } return 0; }');
    await makeCmd().parseAsync(['node', 'test', 'report', '-d', scanDir, '-o', '/tmp/report.csv']);
    expect(getFs().writeFileSync).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Relatorio salvo'));
  });

  it('scan should skip test files', async () => {
    getFs().existsSync = jest.fn(() => true);
    getFs().readdirSync = jest.fn(() => [
      { name: 'myfile.test.ts', isDirectory: () => false },
      { name: 'myfile.ts', isDirectory: () => false },
    ]);
    getFs().readFileSync = jest.fn((p) => p.includes('.test.ts') ? '' : 'function realFn() { return 1; }');
    await makeCmd().parseAsync(['node', 'test', 'scan', '-d', scanDir]);
    expect(printLine).toHaveBeenCalledWith(expect.stringMatching(/Total funcoes/));
  });

  it('scan should skip node_modules dirs', async () => {
    getFs().existsSync = jest.fn(() => true);
    getFs().readdirSync = jest.fn(() => [{ name: 'node_modules', isDirectory: () => true }, { name: 'src', isDirectory: () => true }]);
    getFs().readFileSync = jest.fn(() => '');
    await makeCmd().parseAsync(['node', 'test', 'scan', '-d', scanDir]);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('0'));
  });
});
