import type { LawsConfig, ProjectManifest, Target } from '../compile-utils';

const mockYamlParse = jest.fn();
jest.mock('yaml', () => ({
  parse: mockYamlParse,
}));

const mockGetIO = jest.fn();
jest.mock('../../io', () => ({
  getIO: mockGetIO,
}));

import { getIO } from '../../io';
import {
  TARGETS, TARGET_PATHS, COMPILERS,
  readLaws, readManifest, readGlobalRules, readPolicies,
  getBaseRules, getProjectName, getFramework, getCoverageMin,
  compileClaude, compileCursor, compileCopilot, compileWindsurf,
  compileCline, compileGemini, compileContinue, compileZed,
  compileAmazonQ, compileCodex, compileAider, compileCursorMdc,
  compileGithubActions, getPathScopedOutputs, startWatch,
} from '../compile-utils';

const mockFs = {
  exists: jest.fn(),
  read: jest.fn(),
  write: jest.fn(),
  readDir: jest.fn(),
  mkDir: jest.fn(),
  stat: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockYamlParse.mockReset();
  mockGetIO.mockReturnValue({
    fs: mockFs,
    shell: { exec: jest.fn(), execString: jest.fn() },
    http: { post: jest.fn(), get: jest.fn() },
  });
});

const defaultLaws: LawsConfig = {
  architecture: 'Hexagonal',
  defensive_programming: true,
  contract_first: true,
  rules: ['Rule 1', 'Rule 2'],
};

const defaultManifest: ProjectManifest = {
  project: { name: 'MyApp' },
  backend: { framework: 'NestJS' },
  frontend: { framework: 'React' },
  quality: { coverage_min: 85, unit_tests: true },
};

describe('TARGETS', () => {
  it('contains all expected targets', () => {
    expect(TARGETS).toContain('claude');
    expect(TARGETS).toContain('cursor');
    expect(TARGETS).toContain('copilot');
    expect(TARGETS).toContain('windsurf');
    expect(TARGETS).toContain('cline');
    expect(TARGETS).toContain('gemini');
    expect(TARGETS).toContain('continue');
    expect(TARGETS).toContain('zed');
    expect(TARGETS).toContain('amazon-q');
    expect(TARGETS).toContain('codex');
    expect(TARGETS).toContain('aider');
    expect(TARGETS).toContain('cursor-mdc');
    expect(TARGETS).toContain('github-actions');
    expect(TARGETS.length).toBe(13);
  });
});

describe('TARGET_PATHS', () => {
  it('maps every target to a path', () => {
    for (const target of TARGETS) {
      expect(TARGET_PATHS[target]).toBeDefined();
      expect(typeof TARGET_PATHS[target]).toBe('string');
    }
  });
  it('claude maps to CLAUDE.md', () => { expect(TARGET_PATHS.claude).toBe('CLAUDE.md'); });
  it('cursor maps to .cursor/rules', () => { expect(TARGET_PATHS.cursor).toContain('.cursor'); });
});

describe('COMPILERS', () => {
  it('has a compiler for every target', () => {
    for (const target of TARGETS) {
      expect(COMPILERS[target]).toBeDefined();
      expect(typeof COMPILERS[target]).toBe('function');
    }
  });
});

// ─── Read functions ────────────────────────────────────────

describe('readLaws', () => {
  it('returns parsed laws when file exists', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('rules:\n  - "Rule 1"\n  - "Rule 2"');
    mockYamlParse.mockReturnValue({ rules: ['Rule 1', 'Rule 2'] });
    const laws = readLaws('/fake/root');
    expect(laws.rules).toEqual(['Rule 1', 'Rule 2']);
    expect(mockYamlParse).toHaveBeenCalled();
  });
  it('returns empty rules when file missing', () => {
    mockFs.exists.mockReturnValue(false);
    expect(readLaws('/fake/root')).toEqual({ rules: [] });
  });
  it('returns empty rules on parse error', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('bad: yaml: : :');
    mockYamlParse.mockImplementation(() => { throw new Error('parse error'); });
    expect(readLaws('/fake/root')).toEqual({ rules: [] });
  });
});

describe('readManifest', () => {
  it('returns parsed manifest when file exists', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('project: { name: "Test" }');
    mockYamlParse.mockReturnValue({ project: { name: 'Test' } });
    const m = readManifest('/fake/root');
    expect(m.project?.name).toBe('Test');
  });
  it('returns empty object when file missing', () => {
    mockFs.exists.mockReturnValue(false);
    expect(readManifest('/fake/root')).toEqual({});
  });
  it('returns empty object on parse error', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue(':::');
    mockYamlParse.mockImplementation(() => { throw new Error('parse error'); });
    expect(readManifest('/fake/root')).toEqual({});
  });
});

describe('readGlobalRules', () => {
  it('returns parsed rules when file exists', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('- Rule 1\n- Rule 2\n# Comment\n');
    const rules = readGlobalRules('/fake/root');
    expect(rules).toEqual(['Rule 1', 'Rule 2']);
  });
  it('returns empty array when file missing', () => {
    mockFs.exists.mockReturnValue(false);
    expect(readGlobalRules('/fake/root')).toEqual([]);
  });
  it('filters empty lines and comments', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('\n- Rule 1\n\n# Comment\n- Rule 2\n');
    expect(readGlobalRules('/fake/root')).toEqual(['Rule 1', 'Rule 2']);
  });
});

describe('readPolicies', () => {
  it('returns policy lines from yaml files', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.readDir.mockReturnValue(['policy1.yaml', 'policy2.yaml']);
    mockFs.read
      .mockReturnValueOnce('forbidden_tokens: ["token1", "token2"]')
      .mockReturnValueOnce('required_files: ["file1", "file2"]');
    mockYamlParse
      .mockReturnValueOnce({ forbidden_tokens: ['token1', 'token2'] })
      .mockReturnValueOnce({ required_files: ['file1', 'file2'] });
    const policies = readPolicies('/fake/root');
    expect(policies).toContain('Forbidden tokens: token1, token2');
    expect(policies).toContain('Required files: file1, file2');
    expect(policies.length).toBe(2);
  });
  it('returns empty array when policies dir missing', () => {
    mockFs.exists.mockReturnValue(false);
    expect(readPolicies('/fake/root')).toEqual([]);
  });
  it('skips non-yaml files', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.readDir.mockReturnValue(['policy.txt', 'notes.md']);
    expect(readPolicies('/fake/root')).toEqual([]);
  });
});

// ─── Getter functions ──────────────────────────────────────

describe('getBaseRules', () => {
  it('combines laws, global rules and policies', () => {
    const laws: LawsConfig = { rules: ['law1', 'law2'] };
    const globalRules = ['global1'];
    const policies = ['policy1'];
    expect(getBaseRules(laws, globalRules, policies)).toEqual(['law1', 'law2', 'global1', 'policy1']);
  });
  it('handles empty laws rules', () => {
    expect(getBaseRules({}, [], [])).toEqual([]);
  });
  it('handles undefined rules in laws', () => {
    expect(getBaseRules({ rules: undefined }, ['g1'], [])).toEqual(['g1']);
  });
});

describe('getProjectName', () => {
  it('returns name from manifest', () => {
    expect(getProjectName({ project: { name: 'MyApp' } })).toBe('MyApp');
  });
  it('returns fallback when no name', () => {
    expect(getProjectName({})).toBe('project');
  });
  it('returns fallback when no project section', () => {
    expect(getProjectName({ backend: {} })).toBe('project');
  });
});

describe('getFramework', () => {
  it('returns framework from manifest', () => {
    expect(getFramework({ backend: { framework: 'Express' } })).toBe('Express');
  });
  it('returns unknown as fallback', () => {
    expect(getFramework({})).toBe('unknown');
  });
});

describe('getCoverageMin', () => {
  it('returns coverage from manifest', () => {
    expect(getCoverageMin({ quality: { coverage_min: 90 } })).toBe(90);
  });
  it('returns default 80 when not specified', () => {
    expect(getCoverageMin({})).toBe(80);
  });
  it('returns default 80 when quality section missing', () => {
    expect(getCoverageMin({ project: {} })).toBe(80);
  });
});

// ─── Compiler functions ────────────────────────────────────

const policies: string[] = ['Forbidden tokens: secret', 'Required files: readme'];
const globalRules: string[] = ['No explicit any', 'Prefer const'];

describe('compileClaude', () => {
  it('generates CLAUDE.md content', () => {
    const out = compileClaude(defaultManifest, defaultLaws, globalRules, policies);
    expect(out).toContain('MyApp');
    expect(out).toContain('Hexagonal');
    expect(out).toContain('NestJS');
    expect(out).toContain('React');
    expect(out).toContain('85%');
    expect(out).toContain('Rule 1');
    expect(out).toContain('No explicit any');
    expect(out).toContain('Forbidden tokens: secret');
  });
  it('includes defensive and contract-first lines', () => {
    const out = compileClaude(defaultManifest, defaultLaws, [], []);
    expect(out).toContain('Defensive programming: true');
    expect(out).toContain('Contract-first: true');
  });
  it('uses fallback architecture when not specified', () => {
    const out = compileClaude(defaultManifest, {}, [], []);
    expect(out).toContain('Clean Architecture');
  });
});

describe('compileCursor', () => {
  it('generates cursor rules content', () => {
    const out = compileCursor(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Cursor Rules');
    expect(out).toContain('Hexagonal');
    expect(out).toContain('No explicit any');
  });
  it('includes frontmatter', () => {
    const out = compileCursor(defaultManifest, defaultLaws, [], []);
    expect(out).toMatch(/^---/);
    expect(out).toContain('description:');
    expect(out).toContain('globs:');
  });
});

describe('compileCopilot', () => {
  it('generates copilot instructions content', () => {
    const out = compileCopilot(defaultManifest, defaultLaws, globalRules, policies);
    expect(out).toContain('Copilot Instructions');
    expect(out).toContain('MyApp');
    expect(out).toContain('85%');
    expect(out).toContain('Unit tests required: true');
    expect(out).toContain('Forbidden tokens: secret');
  });
  it('includes coding rules section', () => {
    const out = compileCopilot(defaultManifest, defaultLaws, ['No any'], []);
    expect(out).toContain('## Coding Rules');
    expect(out).toContain('- No any');
  });
});

describe('compileWindsurf', () => {
  it('generates windsurf rules content', () => {
    const out = compileWindsurf(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Windsurf Governance');
    expect(out).toContain('Hexagonal');
    expect(out).toContain('ai-devkit verify');
    expect(out).toContain('85%');
  });
  it('includes quality gates section', () => {
    const out = compileWindsurf(defaultManifest, defaultLaws, [], []);
    expect(out).toContain('## Quality Gates');
  });
});

describe('compileCline', () => {
  it('generates cline rules content', () => {
    const out = compileCline(defaultManifest, defaultLaws, globalRules, policies);
    expect(out).toContain('Cline Rules');
    expect(out).toContain('MyApp');
    expect(out).toContain('NestJS');
    expect(out).toContain('85%');
    expect(out).toContain('ai-devkit verify');
    expect(out).toContain('Forbidden tokens: secret');
  });
  it('includes before committing section', () => {
    const out = compileCline(defaultManifest, defaultLaws, [], []);
    expect(out).toContain('## Before committing');
  });
});

describe('compileGemini', () => {
  it('generates gemini instructions content', () => {
    const out = compileGemini(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Gemini Code Assist');
    expect(out).toContain('MyApp');
    expect(out).toContain('NestJS');
    expect(out).toContain('85%');
    expect(out).toContain('Defensive programming');
  });
  it('includes quality standards section', () => {
    const out = compileGemini(defaultManifest, defaultLaws, [], []);
    expect(out).toContain('## Quality Standards');
    expect(out).toContain('JSDoc');
    expect(out).toContain('Domain layer');
  });
});

describe('compileContinue', () => {
  it('generates continue dev rules content', () => {
    const out = compileContinue(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Continue Dev Rules');
    expect(out).toContain('MyApp');
    expect(out).toContain('Hexagonal');
    expect(out).toContain('85%');
  });
});

describe('compileZed', () => {
  it('generates zed editor rules content', () => {
    const out = compileZed(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Zed Editor Rules');
    expect(out).toContain('ai-devkit verify');
    expect(out).toContain('No explicit any');
  });
  it('includes before commit section', () => {
    const out = compileZed(defaultManifest, defaultLaws, [], []);
    expect(out).toContain('## Before commit');
  });
});

describe('compileAmazonQ', () => {
  it('generates amazon q developer rules content', () => {
    const out = compileAmazonQ(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Amazon Q Developer');
    expect(out).toContain('MyApp');
    expect(out).toContain('Hexagonal');
    expect(out).toContain('85%');
    expect(out).toContain('Defensive programming');
  });
});

describe('compileCodex', () => {
  it('generates codex instructions content', () => {
    const out = compileCodex(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Codex Instructions');
    expect(out).toContain('MyApp');
    expect(out).toContain('85%');
  });
});

describe('compileAider', () => {
  it('generates aider instructions content', () => {
    const out = compileAider(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Aider AI Instructions');
    expect(out).toContain('MyApp');
    expect(out).toContain('ai-devkit verify');
    expect(out).toContain('85%');
  });
  it('includes quality gates section', () => {
    const out = compileAider(defaultManifest, defaultLaws, [], []);
    expect(out).toContain('## Quality Gates');
  });
});

describe('compileCursorMdc', () => {
  it('generates cursor mdc rules content', () => {
    const out = compileCursorMdc(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('Cursor MDC Rules');
    expect(out).toContain('Hexagonal');
    expect(out).toContain('85%');
  });
  it('includes frontmatter', () => {
    const out = compileCursorMdc(defaultManifest, defaultLaws, [], []);
    expect(out).toMatch(/^---/);
    expect(out).toContain('MDC format');
  });
});

describe('compileGithubActions', () => {
  it('generates github actions instructions content', () => {
    const out = compileGithubActions(defaultManifest, defaultLaws, globalRules, []);
    expect(out).toContain('GitHub Actions AI');
    expect(out).toContain('MyApp');
    expect(out).toContain('85%');
    expect(out).toContain('ai-devkit verify');
    expect(out).toContain('CI pipeline');
  });
  it('includes CI requirements section', () => {
    const out = compileGithubActions(defaultManifest, defaultLaws, [], []);
    expect(out).toContain('## CI Requirements');
  });
});

// ─── All compilers produce valid output ──────────────────────

describe('all compilers', () => {
  it('every compiler returns a non-empty string', () => {
    for (const target of TARGETS) {
      const out = COMPILERS[target](defaultManifest, defaultLaws, globalRules, policies);
      expect(out).toBeTruthy();
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(50);
    }
  });
  it('every compiler handles empty config gracefully', () => {
    for (const target of TARGETS) {
      const out = COMPILERS[target]({}, {}, [], []);
      expect(out).toBeTruthy();
      expect(typeof out).toBe('string');
    }
  });
});

// ─── getPathScopedOutputs ──────────────────────────────────

describe('getPathScopedOutputs', () => {
  it('returns outputs for scoped rules', () => {
    mockFs.exists.mockReturnValue(true);
    const laws: LawsConfig = {
      path_scoped_rules: {
        'packages/core': ['Core-specific rule'],
      },
    };
    const outputs = getPathScopedOutputs('/root', defaultManifest, laws, globalRules, policies);
    expect(outputs.length).toBe(2);
    expect(outputs[0].path).toContain('.clinerules');
    expect(outputs[1].path).toContain('.cursorrules');
    expect(outputs[0].content).toContain('MyApp');
    expect(outputs[0].content).toContain('Core-specific rule');
    expect(outputs[0].content).toContain('No explicit any');
  });
  it('returns empty when no scoped rules', () => {
    expect(getPathScopedOutputs('/root', defaultManifest, {}, [], [])).toEqual([]);
  });
  it('skips scopes where directory does not exist', () => {
    mockFs.exists.mockReturnValue(false);
    const laws: LawsConfig = {
      path_scoped_rules: { 'missing/dir': ['rule'] },
    };
    expect(getPathScopedOutputs('/root', defaultManifest, laws, [], [])).toEqual([]);
  });
});

// ─── startWatch ─────────────────────────────────────────────

describe('startWatch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a timer handle', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.stat.mockReturnValue({ mtimeMs: Date.now() });
    const handle = startWatch('/fake/root', 5000);
    expect(handle).toBeDefined();
    expect(typeof handle).toBe('object');
    clearInterval(handle);
  });

  it('does not recompile when mtime unchanged', () => {
    const mtime = Date.now();
    mockFs.exists.mockReturnValue(true);
    mockFs.stat.mockReturnValue({ mtimeMs: mtime });
    const handle = startWatch('/fake/root', 5000);
    jest.advanceTimersByTime(5000);
    expect(mockFs.read).not.toHaveBeenCalled();
    clearInterval(handle);
  });

  it('recompiles when mtime changes', () => {
    let mtime = Date.now();
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('');
    mockYamlParse.mockReturnValue({});
    mockFs.stat
      .mockReturnValueOnce({ mtimeMs: mtime })
      .mockReturnValueOnce({ mtimeMs: mtime + 1000 });

    const handle = startWatch('/fake/root', 5000);
    jest.advanceTimersByTime(5000);
    expect(mockFs.read).toHaveBeenCalled();
    clearInterval(handle);
  });
});
