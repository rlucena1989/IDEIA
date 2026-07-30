import { Command } from 'commander';

jest.mock('@ideia/technology-radar', () => ({
  TechnologyRadar: jest.fn(),
  createTechnologyRadar: jest.fn(),
}));

jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn(),
}));

jest.mock('../../utils/output');

import { createTechnologyRadar } from '@ideia/technology-radar';
import { createBus } from '@ideia/event-bus';

import { radarCommand } from '../radar';

const mockRadar = () => ({
  scan: jest.fn().mockResolvedValue([
    { name: 'Rust', description: 'Systems programming language', sources: { github: true, npm: false, arxiv: false } },
    { name: 'Bun', description: 'JavaScript runtime', sources: { github: false, npm: true, arxiv: false } },
  ]),
  getRecommendations: jest.fn().mockReturnValue([
    { technology: { name: 'Rust', description: 'Systems programming language' }, score: 4.5 },
  ]),
  getTrending: jest.fn().mockReturnValue([
    { name: 'Rust', description: 'Systems programming language' },
  ]),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (createBus as jest.Mock).mockResolvedValue({});
  (createTechnologyRadar as jest.Mock).mockReturnValue(mockRadar());
});

describe('radarCommand', () => {
  it('returns a Commander Command with name radar', async () => {
    const cmd = await radarCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('radar');
  });

  it('has description', async () => {
    const cmd = await radarCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has sub-commands scan, recommend, trending', async () => {
    const cmd = await radarCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(expect.arrayContaining(['scan', 'recommend', 'trending']));
  });

  it('creates event bus and technology radar', async () => {
    await radarCommand();
    expect(createBus).toHaveBeenCalled();
    expect(createTechnologyRadar).toHaveBeenCalledWith({});
  });
});
