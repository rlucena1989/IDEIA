import {
  RunStatus,
  LanguageId,
  AdapterCommandId,
  RunOptions,
  AdapterResult,
  LangRunner,
  RetryPolicy,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY,
  execCommand,
  readAdapterManifest,
} from '../adapter-contract';

describe('adapter-contract', () => {
  describe('RunStatus enum', () => {
    it('should have expected values', () => {
      expect(RunStatus.Success).toBe('success');
      expect(RunStatus.Failure).toBe('failure');
      expect(RunStatus.Skipped).toBe('skipped');
      expect(RunStatus.Timeout).toBe('timeout');
    });

    it('should contain all status values', () => {
      const values = Object.values(RunStatus);
      expect(values).toHaveLength(4);
      expect(values).toContain('success');
      expect(values).toContain('failure');
      expect(values).toContain('skipped');
      expect(values).toContain('timeout');
    });
  });

  describe('LanguageId enum', () => {
    it('should have expected values', () => {
      expect(LanguageId.TypeScript).toBe('typescript');
      expect(LanguageId.JavaScript).toBe('javascript');
      expect(LanguageId.Node).toBe('node');
      expect(LanguageId.Python).toBe('python');
      expect(LanguageId.Go).toBe('go');
      expect(LanguageId.Rust).toBe('rust');
      expect(LanguageId.Java).toBe('java');
      expect(LanguageId.Kotlin).toBe('kotlin');
      expect(LanguageId.Ruby).toBe('ruby');
      expect(LanguageId.PHP).toBe('php');
      expect(LanguageId.Swift).toBe('swift');
      expect(LanguageId.CSharp).toBe('csharp');
      expect(LanguageId.Dart).toBe('dart');
      expect(LanguageId.Elixir).toBe('elixir');
      expect(LanguageId.Haskell).toBe('haskell');
      expect(LanguageId.Zig).toBe('zig');
      expect(LanguageId.React).toBe('react');
      expect(LanguageId.Vue).toBe('vue');
      expect(LanguageId.ReactNative).toBe('react-native');
      expect(LanguageId.Flutter).toBe('flutter');
    });

    it('should have 20 language entries', () => {
      expect(Object.keys(LanguageId).length).toBe(20);
    });
  });

  describe('AdapterCommandId enum', () => {
    it('should have expected values', () => {
      expect(AdapterCommandId.Init).toBe('init');
      expect(AdapterCommandId.Lint).toBe('lint');
      expect(AdapterCommandId.Test).toBe('test');
      expect(AdapterCommandId.Build).toBe('build');
      expect(AdapterCommandId.Compile).toBe('compile');
      expect(AdapterCommandId.QualityGate).toBe('quality-gate');
      expect(AdapterCommandId.Detect).toBe('detect');
    });

    it('should contain all command values', () => {
      const values = Object.values(AdapterCommandId);
      expect(values).toHaveLength(7);
    });
  });

  describe('execCommand() function', () => {
    it('should be a function', () => {
      expect(typeof execCommand).toBe('function');
    });

    it('should have correct arity (default opts excluded)', () => {
      expect(execCommand.length).toBe(2);
    });
  });

  describe('readAdapterManifest() function', () => {
    it('should be a function', () => {
      expect(typeof readAdapterManifest).toBe('function');
    });

    it('should reject when file does not exist', async () => {
      await expect(readAdapterManifest('/nonexistent/manifest.json')).rejects.toThrow();
    });
  });

  describe('DEFAULT_TIMEOUT_MS constant', () => {
    it('should be 120000', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(120000);
    });
  });

  describe('DEFAULT_RETRY constant', () => {
    it('should have maxAttempts 1 and backoffMs 0', () => {
      expect(DEFAULT_RETRY.maxAttempts).toBe(1);
      expect(DEFAULT_RETRY.backoffMs).toBe(0);
    });
  });

  describe('Type interfaces (compile-time checks)', () => {
    it('AdapterResult should have required fields', () => {
      const result: AdapterResult = {
        command: AdapterCommandId.Test,
        language: LanguageId.Node,
        status: RunStatus.Success,
        exitCode: 0,
        stdout: 'ok',
        stderr: '',
        durationMs: 100,
        cwd: '/test',
        commandLine: 'npm test',
      };
      expect(result.command).toBe(AdapterCommandId.Test);
      expect(result.status).toBe(RunStatus.Success);
      expect(result.error).toBeUndefined();
    });

    it('RunOptions should be partially assignable', () => {
      const opts: RunOptions = { timeoutMs: 60000, args: ['--coverage'] };
      expect(opts.timeoutMs).toBe(60000);
      expect(opts.args).toEqual(['--coverage']);
    });

    it('RetryPolicy interface should have required fields', () => {
      const policy: RetryPolicy = { maxAttempts: 3, backoffMs: 1000 };
      expect(policy.maxAttempts).toBe(3);
      expect(policy.backoffMs).toBe(1000);
    });

    it('LangRunner interface should define the contract shape', () => {
      const runner: LangRunner = {
        language: LanguageId.Node,
        name: 'Test',
        aliases: ['test'],
        detect: jest.fn(),
        init: jest.fn(),
        lint: jest.fn(),
        test: jest.fn(),
        build: jest.fn(),
        compile: jest.fn(),
        qualityGate: jest.fn(),
        commands: jest.fn(),
      };
      expect(runner.language).toBe(LanguageId.Node);
      expect(typeof runner.detect).toBe('function');
      expect(typeof runner.commands).toBe('function');
    });
  });
});
