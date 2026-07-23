import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLowLevelCommand, lowLevelMemoryAction, lowLevelConcurrencyAction, lowLevelPlatformAction } from '../low-level';

jest.mock('../../runtime/memory-analyzer');
jest.mock('../../runtime/concurrency-analyzer');
jest.mock('../../runtime/platform-analyzer');

import { analyzeMemory } from '../../runtime/memory-analyzer';
import { analyzeConcurrency } from '../../runtime/concurrency-analyzer';
import { getPlatformInfo, validatePlatform } from '../../runtime/platform-analyzer';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'low-level-test-'));
const TEST_FILE = path.join(TEST_DIR, 'test.ts');

beforeAll(() => {
  fs.writeFileSync(TEST_FILE, 'const x = 1;', 'utf8');
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  (analyzeMemory as jest.Mock).mockReturnValue({ summary: 'OK', metrics: [], leakSignals: [] });
  (analyzeConcurrency as jest.Mock).mockReturnValue({ summary: 'OK', findings: [] });
  (getPlatformInfo as jest.Mock).mockReturnValue({ os: 'linux', arch: 'x64', nodeVersion: 'v20', shell: 'bash' });
  (validatePlatform as jest.Mock).mockReturnValue({ summary: 'OK', rules: [{ id: 'NODE_VERSION', pass: true, message: 'OK' }] });
});

describe('lowLevelMemoryAction', () => {
  it('deve analisar memoria', () => {
    lowLevelMemoryAction(TEST_FILE, {});
    expect(analyzeMemory).toHaveBeenCalled();
  });

  it('deve reportar erro se arquivo nao existe', () => {
    lowLevelMemoryAction(path.join(TEST_DIR, 'nonexistent.ts'), {});
    expect(console.error).toHaveBeenCalledWith('Arquivo nao encontrado:', expect.any(String));
    expect(analyzeMemory).not.toHaveBeenCalled();
  });
});

describe('lowLevelConcurrencyAction', () => {
  it('deve analisar concorrencia', () => {
    lowLevelConcurrencyAction(TEST_FILE, {});
    expect(analyzeConcurrency).toHaveBeenCalled();
  });
});

describe('lowLevelPlatformAction', () => {
  it('deve exibir info da plataforma', () => {
    lowLevelPlatformAction({});
    expect(getPlatformInfo).toHaveBeenCalled();
    expect(validatePlatform).toHaveBeenCalled();
  });

  it('deve retornar JSON quando solicitado', () => {
    lowLevelPlatformAction({ json: true });
    expect(console.log).toHaveBeenCalled();
  });
});

describe('createLowLevelCommand', () => {
  it('should be defined', () => {
    expect(createLowLevelCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = createLowLevelCommand();
    expect(cmd.name()).toBe('low-level');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('memory');
    expect(names).toContain('concurrency');
    expect(names).toContain('platform');
  });
});
