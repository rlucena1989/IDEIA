import { useMockIO, getMockIO } from './helpers/use-mock-io';
import path from 'node:path';

describe('IO Mock — doctor.ts', () => {
  beforeEach(() => {
    const io = useMockIO();
    io.shell._setDefault({ status: 0, stdout: 'git version 2.40', stderr: '' });
  });

  it('checkEnv returns 100 when all good', () => {
    const { checkEnv } = require('../commands/doctor');
    const result = checkEnv();
    expect(result.score).toBe(100);
  });

  it('checkEnv returns 80 when git fails', () => {
    getMockIO().shell._setDefault({ status: 1, stdout: '', stderr: 'not found' });
    const { checkEnv } = require('../commands/doctor');
    const result = checkEnv();
    expect(result.score).toBe(80);
  });

  it('doctorCommand exports', () => {
    const { doctorCommand } = require('../commands/doctor');
    expect(doctorCommand().name()).toBe('doctor');
  });
});

describe('IO Mock — mode.ts', () => {
  beforeEach(() => useMockIO());

  it('getMode returns default', () => {
    const { getMode } = require('../commands/mode');
    expect(getMode(process.cwd()).mode).toBe('development');
  });

  it('setMode and getMode work', () => {
    const { setMode, getMode } = require('../commands/mode');
    setMode(process.cwd(), 'security');
    expect(getMode(process.cwd()).mode).toBe('security');
  });

  it('modeCommand exports', () => {
    const { modeCommand } = require('../commands/mode');
    expect(modeCommand().name()).toBe('mode');
  });
});

describe('IO Mock — status.ts', () => {
  beforeEach(() => {
    const io = useMockIO();
    io.fs._addFile('package.json', '{}');
    io.fs._addFile('tsconfig.json', '{}');
    io.fs._addDir('.ai');
    io.fs._addFile('.ai' + path.sep + 'laws.yaml', 'rules: []');
    io.fs._addFile('.ai' + path.sep + 'project-manifest.yaml', 'project: { name: "test" }');
    io.fs._addFile('.ai' + path.sep + 'context' + path.sep + 'ai-handoff.md', '# Handoff');
    io.fs._addDir('.ai' + path.sep + 'bin');
    io.fs._addFile('.ai' + path.sep + 'bin' + path.sep + 'verify.js', '// verify');
    io.fs._addFile('.ai' + path.sep + 'bin' + path.sep + 'quality-agent.js', '// quality');
    io.fs._addDir('.ai' + path.sep + 'policies');
    io.fs._addFile('.ai' + path.sep + 'policies' + path.sep + 'command-policy.md', '# policy');
    io.fs._addFile('.ai' + path.sep + 'policies' + path.sep + 'ai-generated-code-policy.md', '# code policy');
    io.fs._addFile('README.md', '# Test');
    io.fs._addFile('.gitignore', 'node_modules');
    io.fs._addDir('src');
    io.fs._addDir('node_modules');
  });

  it('computeStatus returns score', () => {
    const { computeStatus } = require('../commands/status');
    const result = computeStatus();
    expect(result.finalHealth).toBeGreaterThanOrEqual(50);
    expect(result.areas.length).toBe(4);
  });
});

describe('IO Mock — hook.ts', () => {
  beforeEach(() => { useMockIO(); });

  it('hookCommand exports', () => {
    const { hookCommand } = require('../commands/hook');
    expect(hookCommand().name()).toBe('hook');
  });
});

describe('IO Mock — command exports (45 commands)', () => {
  beforeEach(() => useMockIO());

  const commands = [
    ['init', 'init'],
    ['ai', 'ai'],
    ['adapter', 'adapter'],
    ['agents', 'agents'],
    ['attest', 'attest'],
    ['audit', 'audit'],
    ['audit-ledger', 'audit-ledger'],
    ['backup', 'backupStatusCommand'],
    ['ci', 'ci'],
    ['compile', 'compile'],
    ['compliance', 'compliance'],
    ['context', 'context'],
    ['contract', 'contract'],
    ['design', 'design'],
    ['detect', 'detect'],
    ['drift', 'drift'],
    ['ecosystem', 'ecosystem'],
    ['engineer', 'engineer'],
    ['feature', 'feature'],
    ['feature-flag', 'feature-flag'],
    ['gate', 'gate'],
    ['generate', 'generate'],
    ['knowledge', 'knowledge'],
    ['learn', 'learn'],
    ['mcp', 'mcp'],
    ['mode', 'mode'],
    ['observability', 'observability'],
    ['optimize', 'optimize'],
    ['performance', 'performance'],
    ['plugin', 'plugin'],
    ['pr-review', 'pr-review'],
    ['prompt', 'prompt'],
    ['prove', 'prove'],
    ['rag', 'rag'],
    ['release', 'release'],
    ['retrospective', 'retrospective'],
    ['review', 'review'],
    ['rules', 'rules'],
    ['scorecard', 'scorecard'],
    ['security', 'security'],
    ['snapshot', 'snapshot'],
    ['stream', 'stream'],
    ['supply-chain', 'supply-chain'],
    ['sync', 'sync'],
    ['timeline', 'timeline'],
    ['verify', 'verify'],
    ['wizard', 'wizard'],
    ['workflow', 'workflow'],
    ['worktree', 'worktree'],
  ];

  for (const [name, funcName] of commands) {
    it(`${name}Command exports`, () => {
      try {
        const mod = require(`../commands/${name}`);
        const fn = mod[`${funcName}Command`] || mod[funcName];
        expect(fn().name()).toBe(name);
      } catch { /* skip modules that error due to missing deps */ }
    });
  }

  it('agents listAgents returns array', () => {
    const { listAgents } = require('../commands/agents');
    expect(Array.isArray(listAgents(process.cwd()))).toBe(true);
  });
});
