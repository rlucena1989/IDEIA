import { evolutionCommand } from '../evolution';

jest.mock('../../utils/output');
jest.mock('@ideia/autonomous-evolution-engine', () => ({
  EvolutionCycle: jest.fn(() => ({})),
}), { virtual: true });
jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn(() => Promise.resolve({})),
}), { virtual: true });
jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(() => ({})),
}), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('evolutionCommand', () => {
  it('should be defined', () => {
    expect(evolutionCommand).toBeDefined();
  });

  it('should return Command with all subcommands', () => {
    const cmd = evolutionCommand();
    expect(cmd.name()).toBe('evolution');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('scan');
    expect(names).toContain('status');
    expect(names).toContain('auto-fix');
  });
});