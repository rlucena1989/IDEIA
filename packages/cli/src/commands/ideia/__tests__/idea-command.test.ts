jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

const mockStartEngineerMode = jest.fn();
const mockListEngineerSessions = jest.fn();
jest.mock('../../engineer', () => ({
  startEngineerMode: mockStartEngineerMode,
  listEngineerSessions: mockListEngineerSessions,
  EngineerSession: {},
}));

jest.mock('../../../io', () => ({
  getIO: jest.fn(() => ({ fs: { cwd: jest.fn(() => '/test') } })),
}));

const mockKeywordClassifier = jest.fn();
jest.mock('../../../intent-classifier', () => ({
  keywordClassifier: mockKeywordClassifier,
}));

import {
  classifyIdeaNaturalLanguage, buildPlan, runIdeiaPipeline,
  ideaCommand,
} from '../idea-command';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = ideaCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockKeywordClassifier.mockReturnValue({ intent: 'web-app', confidence: 0.85, reasoning: 'test' });
});

describe('classifyIdeaNaturalLanguage', () => {
  it('detects React/Next.js', () => {
    const r = classifyIdeaNaturalLanguage('Build a next app with postgres');
    expect(r.stack).toContain('Next.js');
    expect(r.stack).toContain('PostgreSQL');
  });

  it('detects Vue', () => {
    expect(classifyIdeaNaturalLanguage('Build a vue dashboard').stack).toContain('Vue.js');
  });

  it('detects Angular', () => {
    expect(classifyIdeaNaturalLanguage('Build an angular app').stack).toContain('Angular');
  });

  it('detects MongoDB', () => {
    expect(classifyIdeaNaturalLanguage('Build with mongo backend').stack).toContain('MongoDB');
  });

  it('detects Prisma', () => {
    expect(classifyIdeaNaturalLanguage('Build with prisma orm').stack).toContain('Prisma + PostgreSQL');
  });

  it('detects Stripe and payments', () => {
    const r = classifyIdeaNaturalLanguage('Build a saas with stripe payments');
    expect(r.stack).toContain('Stripe');
    expect(r.architecture).toContain('Multi-tenancy');
  });

  it('detects auth', () => {
    expect(classifyIdeaNaturalLanguage('with auth and login').stack).toContain('Auth (JWT + OAuth)');
  });

  it('detects Docker', () => {
    expect(classifyIdeaNaturalLanguage('Deploy with docker').stack).toContain('Docker');
  });

  it('detects Vercel', () => {
    expect(classifyIdeaNaturalLanguage('Deploy to vercel').stack).toContain('Vercel');
  });

  it('estimates files', () => {
    expect(classifyIdeaNaturalLanguage('simple app').estimatedFiles).toBeGreaterThanOrEqual(28);
  });

  it('identifies webhook risk', () => {
    expect(classifyIdeaNaturalLanguage('Build with stripe').risks.some(r => r.includes('Webhook'))).toBe(true);
  });

  it('identifies multi-tenant risk', () => {
    expect(classifyIdeaNaturalLanguage('multi tenant app').risks.some(r => r.includes('multi-tenancy'))).toBe(true);
  });
});

describe('buildPlan', () => {
  it('returns 8 default steps', () => {
    const plan = buildPlan('test', { stack: [] });
    expect(plan).toHaveLength(8);
    expect(plan[0].module).toBe('infra');
    expect(plan[7].module).toBe('delivery');
  });

  it('inserts payment step for Stripe', () => {
    const plan = buildPlan('saas with stripe', { stack: ['Stripe'] });
    expect(plan.length).toBeGreaterThan(8);
    expect(plan.some(s => s.action.includes('gateway'))).toBe(true);
  });

  it('all steps pending', () => {
    expect(buildPlan('test', { stack: [] }).every(s => s.status === 'pending')).toBe(true);
  });
});

describe('runIdeiaPipeline', () => {
  it('returns analysis without executing when not approved', async () => {
    const result = await runIdeiaPipeline('test idea', '/test');
    expect(result.analysis).toBeDefined();
    expect(result.session).toBeNull();
    expect(mockStartEngineerMode).not.toHaveBeenCalled();
  });

  it('starts engineer mode when approved', async () => {
    mockStartEngineerMode.mockResolvedValue({ id: 's1', status: 'completed', iteration: 3, maxIterations: 5, gates: [] });
    const result = await runIdeiaPipeline('test', '/test', { approve: true, autonomy: 'N3' });
    expect(mockStartEngineerMode).toHaveBeenCalled();
    expect(result.session).toBeDefined();
  });
});

describe('idea analyze action', () => {
  it('analyzes idea', async () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    await makeAction('analyze')(['Build a nextjs app']);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('IDEIA'));
    spyLog.mockRestore();
  });
});

describe('idea status action', () => {
  it('shows no sessions when empty', () => {
    mockListEngineerSessions.mockReturnValue([]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('status')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Nenhuma ideia'));
    spyLog.mockRestore();
  });
});
