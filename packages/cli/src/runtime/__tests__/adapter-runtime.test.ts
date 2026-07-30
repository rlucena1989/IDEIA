import { AdapterRuntime, defaultRuntime} from '../adapter-runtime';
import { AdapterCommandId, LanguageId, LangRunner, RunStatus, AdapterResult } from '../adapter-contract';

jest.mock('../stack-detector', () => ({
  detectLanguages: jest.fn(() => ['Node.js', 'TypeScript']),
}));

function makeMockRunner(language: LanguageId, name: string): jest.Mocked<LangRunner> {
  return {
    language,
    name,
    aliases: [name.toLowerCase()],
    detect: jest.fn().mockReturnValue(true),
    init: jest.fn().mockResolvedValue({
      command: AdapterCommandId.Init,
      language,
      status: RunStatus.Success,
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 0,
      cwd: '',
      commandLine: `init ${name}`,
    } as AdapterResult),
    lint: jest.fn(),
    test: jest.fn(),
    build: jest.fn(),
    compile: jest.fn(),
    qualityGate: jest.fn(),
    commands: jest.fn().mockReturnValue([]),
  };
}

describe('AdapterRuntime', () => {
  let rt: AdapterRuntime;

  beforeEach(() => {
    rt = new AdapterRuntime();
  });

  describe('defaultRuntime singleton', () => {
    it('should be an instance of AdapterRuntime', () => {
      expect(defaultRuntime).toBeInstanceOf(AdapterRuntime);
    });

    it('should be the same reference across imports', () => {
      const { defaultRuntime: dr2 } = jest.requireActual('../adapter-runtime');
      expect(defaultRuntime).toBe(dr2);
    });
  });

  describe('getSupportedLanguages()', () => {
    it('should return all registered languages', () => {
      const langs = rt.getSupportedLanguages();
      expect(langs.length).toBeGreaterThan(10);
      expect(langs).toContain(LanguageId.Node);
      expect(langs).toContain(LanguageId.Python);
      expect(langs).toContain(LanguageId.Go);
      expect(langs).toContain(LanguageId.Rust);
    });
  });

  describe('detect()', () => {
    it('should detect languages from cwd via stack-detector', () => {
      const result = rt.detect('/some/path');
      expect(result.primary).toBe(LanguageId.Node);
      expect(result.languages).toContain(LanguageId.Node);
      expect(result.raw).toEqual(['Node.js', 'TypeScript']);
    });

    it('should return null primary when no language detected', () => {
      const { detectLanguages } = require('../stack-detector');
      detectLanguages.mockReturnValueOnce([]);
      const result = rt.detect('/empty/path');
      expect(result.primary).toBeNull();
      expect(result.languages).toEqual([]);
    });
  });

  describe('register() / unregister() / getRunner()', () => {
    it('should register a new runner', () => {
      const mockRunner = makeMockRunner(LanguageId.Elixir, 'Elixir');
      rt.register(mockRunner);
      expect(rt.getRunner(LanguageId.Elixir)).toBe(mockRunner);
    });

    it('should unregister an existing runner', () => {
      rt.unregister(LanguageId.Node);
      expect(rt.getRunner(LanguageId.Node)).toBeUndefined();
    });

    it('listRunners should return all registered runners', () => {
      const runners = rt.listRunners();
      expect(runners.length).toBeGreaterThan(10);
      expect(runners.some(r => r.language === LanguageId.Node)).toBe(true);
    });
  });

  describe('execute()', () => {
    it('should delegate to runner.init for Init command', async () => {
      const mockRunner = makeMockRunner(LanguageId.Go, 'Go');
      rt.register(mockRunner);

      await rt.execute(LanguageId.Go, AdapterCommandId.Init, '/test');
      expect(mockRunner.init).toHaveBeenCalledWith('/test', undefined);
    });

    it('should delegate to runner.test for Test command', async () => {
      const mockRunner = makeMockRunner(LanguageId.Python, 'Python');
      rt.register(mockRunner);

      await rt.execute(LanguageId.Python, AdapterCommandId.Test, '/test', { timeoutMs: 30000 });
      expect(mockRunner.test).toHaveBeenCalledWith('/test', { timeoutMs: 30000 });
    });

    it('should return Skipped when no runner registered', async () => {
      rt.unregister(LanguageId.Node);
      const result = await rt.execute(LanguageId.Node, AdapterCommandId.Init, '/test');
      expect(result.status).toBe(RunStatus.Skipped);
      expect(result.error).toContain('Nenhum runner');
    });

    it('should return detect result for unknown command when detected', async () => {
      const mockRunner = makeMockRunner(LanguageId.Node, 'Node');
      rt.register(mockRunner);
      mockRunner.detect.mockReturnValue(true);

      const result = await rt.execute(LanguageId.Node, 'some-unknown' as AdapterCommandId, '/test');
      expect(result.stdout).toBe('detected');
    });

    it('should return Skipped for unknown command when not detected', async () => {
      const mockRunner = makeMockRunner(LanguageId.Node, 'Node');
      rt.register(mockRunner);
      mockRunner.detect.mockReturnValue(false);

      const result = await rt.execute(LanguageId.Node, 'some-unknown' as AdapterCommandId, '/test');
      expect(result.status).toBe(RunStatus.Skipped);
    });
  });

  describe('getQualityGates()', () => {
    it('should execute quality gate for detected languages', async () => {
      const mockRunner = makeMockRunner(LanguageId.TypeScript, 'TypeScript');
      rt.register(mockRunner);
      mockRunner.qualityGate.mockResolvedValue({
        command: AdapterCommandId.QualityGate,
        language: LanguageId.TypeScript,
        status: RunStatus.Success,
        exitCode: 0,
        stdout: 'ok',
        stderr: '',
        durationMs: 100,
        cwd: '/test',
        commandLine: 'tsc --noEmit',
      });

      const results = await rt.getQualityGates('/test');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isSupported()', () => {
    it('should return true for registered languages', () => {
      expect(rt.isSupported(LanguageId.Node)).toBe(true);
      expect(rt.isSupported(LanguageId.Rust)).toBe(true);
    });

    it('should return false for unregistered languages', () => {
      expect(rt.isSupported('unknown' as LanguageId)).toBe(false);
    });
  });

  describe('getAllSupportedLanguages()', () => {
    it('should include all registered runner languages', () => {
      const all = rt.getAllSupportedLanguages();
      expect(all).toContain(LanguageId.Node);
      expect(all).toContain(LanguageId.Python);
    });
  });
});
