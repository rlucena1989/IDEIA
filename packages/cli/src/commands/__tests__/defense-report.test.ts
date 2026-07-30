const mockOutput = jest.fn();
const mockOutputLines = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    output: mockOutput,
    outputLines: mockOutputLines,
  })),
}));

import { defenseReportCommand } from '../defense-report';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}): Function {
  const cmd = defenseReportCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('defense status action', () => {
  it('outputs JSON when --json is passed', async () => {
    const action = makeAction('status', { json: true });
    await action([]);
    expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({
      defenses: expect.arrayContaining([
        expect.objectContaining({ name: 'SpecGate' }),
        expect.objectContaining({ name: 'ContinuousEval' }),
      ]),
    }));
  });

  it('outputs formatted lines by default', async () => {
    const action = makeAction('status');
    await action([]);
    expect(mockOutputLines).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('Error Defense System')]),
    );
  });
});

describe('defense history action', () => {
  it('outputs history lines', async () => {
    const action = makeAction('history');
    await action([]);
    expect(mockOutputLines).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('Defense Event History')]),
    );
  });
});

describe('defense effectiveness action', () => {
  it('outputs effectiveness table', async () => {
    const action = makeAction('effectiveness');
    await action([]);
    expect(mockOutputLines).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('Defense Effectiveness')]),
    );
  });
});
