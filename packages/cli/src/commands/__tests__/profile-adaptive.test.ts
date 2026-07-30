import { Command} from 'commander';

const mockInteraction = {
  id: 'mock-id',
  type: 'command_run',
  source: 'cli',
  timestamp: new Date().toISOString(),
  metadata: { command: 'test' },
};
const mockInteraction2 = {
  id: 'mock-id-2',
  type: 'ai_action_approved',
  source: 'cli',
  timestamp: new Date().toISOString(),
};
const mockSuggestion = {
  id: 'sug-1',
  type: 'autonomy' as const,
  title: 'Upgrade autonomy',
  description: 'Test suggestion',
  currentValue: 'assisted',
  suggestedValue: 'autonomous',
  confidence: 0.9,
  reason: 'Test',
  category: 'efficiency' as const,
  createdAt: new Date().toISOString(),
  applied: false,
};

const mockInteractions: unknown[] = [mockInteraction, mockInteraction2];

jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn(() => ({ emit: jest.fn(), on: jest.fn(), off: jest.fn() })),
}));
jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(() => ({ append: jest.fn() })),
}));
jest.mock('@ideia/profiles', () => {
  const actual = jest.requireActual('@ideia/profiles');
  return {
    ...actual,
    createProfiles: jest.fn(() => ({
      list: jest.fn().mockReturnValue([]),
      apply: jest.fn().mockResolvedValue(undefined),
      export: jest.fn().mockReturnValue('{}'),
      import: jest.fn(),
    })),
    UserInteractionTracker: jest.fn().mockImplementation(() => ({
      record: jest.fn().mockReturnValue(mockInteraction),
      getInteractions: jest.fn().mockImplementation(() => mockInteractions),
      getCount: jest.fn().mockReturnValue(2),
      getPhase: jest.fn().mockReturnValue('observation'),
      getState: jest.fn().mockReturnValue({
        totalInteractions: 2,
        byType: { command_run: 1, ai_action_approved: 1 },
        byHour: {},
        recentCommands: [{ command: 'test', count: 1 }],
        periodStart: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }),
      clear: jest.fn(),
      save: jest.fn(),
      load: jest.fn(),
    })),
    AdaptiveSuggestions: jest.fn().mockImplementation(() => ({
      analyze: jest.fn().mockReturnValue({
        suggestions: [mockSuggestion],
        totalInteractions: 2,
        analysisPeriod: '2026-01-01/2026-07-23',
      }),
      getSuggestions: jest.fn().mockReturnValue([mockSuggestion]),
      markApplied: jest.fn().mockImplementation((id: string) => id === 'sug-1'),
      dismiss: jest.fn().mockImplementation((id: string) => id === 'sug-1'),
    })),
    AutoAdaptation: jest.fn().mockImplementation(() => ({
      getPhase: jest.fn().mockReturnValue('observation'),
      getHistory: jest.fn().mockReturnValue([
        {
          from: 'observation',
          to: 'suggestion',
          triggeredAt: new Date().toISOString(),
          triggeredBy: 'threshold' as const,
          interactionCount: 50,
        },
      ]),
      transitionTo: jest.fn().mockReturnValue({
        from: 'observation',
        to: 'suggestion',
        triggeredAt: new Date().toISOString(),
        triggeredBy: 'manual' as const,
        interactionCount: 2,
      }),
      evaluate: jest.fn().mockReturnValue({ apply: [], skip: [mockSuggestion] }),
      execute: jest.fn().mockResolvedValue({
        applied: [],
        skipped: [mockSuggestion],
        phase: 'observation',
        transitions: [],
        summary: 'Applied 0, skipped 1 suggestions in phase observation',
      }),
      getConfig: jest.fn().mockReturnValue({
        observationThreshold: 50,
        suggestionThreshold: 200,
        autoApplyConfidence: 0.85,
        requireApproval: false,
      }),
      updateConfig: jest.fn(),
    })),
  };
});

import { profileAdaptiveCommand } from '../profile-adaptive';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('profileAdaptiveCommand', () => {
  it('returns a Commander Command with name profile-adaptive', () => {
    const cmd = profileAdaptiveCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('profile-adaptive');
  });

  it('has description', () => {
    const cmd = profileAdaptiveCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has observe sub-command', () => {
    const cmd = profileAdaptiveCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('observe');
  });

  it('has status sub-command', () => {
    const cmd = profileAdaptiveCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('status');
  });

  it('has suggestions sub-command', () => {
    const cmd = profileAdaptiveCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('suggestions');
  });

  it('has phase sub-command', () => {
    const cmd = profileAdaptiveCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('phase');
  });

  it('has history sub-command', () => {
    const cmd = profileAdaptiveCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('history');
  });

  it('observe expects a type argument', () => {
    const cmd = profileAdaptiveCommand();
    const observe = cmd.commands.find((c: Command) => c.name() === 'observe')!;
    expect(observe).toBeDefined();
    const registered = (observe as unknown as { registeredArguments: unknown[] }).registeredArguments;
    if (registered) {
      expect(registered.length).toBeGreaterThan(0);
    } else {
      expect(observe.usage()).toContain('<type>');
    }
  });

  it('suggestions has --apply option', () => {
    const cmd = profileAdaptiveCommand();
    const suggestions = cmd.commands.find((c: Command) => c.name() === 'suggestions')!;
    const opts = suggestions.options.map(o => o.attributeName());
    expect(opts).toContain('apply');
  });

  it('suggestions has --dismiss option', () => {
    const cmd = profileAdaptiveCommand();
    const suggestions = cmd.commands.find((c: Command) => c.name() === 'suggestions')!;
    const opts = suggestions.options.map(o => o.attributeName());
    expect(opts).toContain('dismiss');
  });

  it('suggestions has --auto option', () => {
    const cmd = profileAdaptiveCommand();
    const suggestions = cmd.commands.find((c: Command) => c.name() === 'suggestions')!;
    const opts = suggestions.options.map(o => o.attributeName());
    expect(opts).toContain('auto');
  });

  it('phase has --set option', () => {
    const cmd = profileAdaptiveCommand();
    const phase = cmd.commands.find((c: Command) => c.name() === 'phase')!;
    const opts = phase.options.map(o => o.attributeName());
    expect(opts).toContain('set');
  });

  it('all sub-commands support --json flag', () => {
    const cmd = profileAdaptiveCommand();
    for (const sub of cmd.commands) {
      const opts = sub.options.map(o => o.attributeName());
      expect(opts).toContain('json');
    }
  });
});
