const mockOutput = jest.fn();
const mockOutputLines = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    output: mockOutput,
    outputLines: mockOutputLines,
  })),
}));

import { distillReportCommand } from '../distill-report';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}): Function {
  const cmd = distillReportCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('distill status action', () => {
  it('outputs JSON when --json is passed', async () => {
    const action = makeAction('status', { json: true });
    await action([]);
    expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({
      status: 'idle', lastRun: null,
    }));
  });

  it('outputs formatted lines by default', async () => {
    const action = makeAction('status');
    await action([]);
    expect(mockOutputLines).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('Distillation Pipeline Status')]),
    );
  });
});

describe('distill run action', () => {
  it('outputs distillation start message', async () => {
    const action = makeAction('run');
    await action([]);
    expect(mockOutputLines).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('Starting distillation')]),
    );
  });

  it('accepts custom professor and student models', async () => {
    const action = makeAction('run', { professor: 'gpt4', student: 'llama3', samples: '50000' });
    await action([]);
    expect(mockOutputLines).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('gpt4')]),
    );
  });
});

describe('distill history action', () => {
  it('outputs history message', async () => {
    const action = makeAction('history');
    await action([]);
    expect(mockOutputLines).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('Distillation History')]),
    );
  });
});

describe('distill dashboard action', () => {
  it('outputs dashboard', async () => {
    const action = makeAction('dashboard');
    await action([]);
    expect(mockOutputLines).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('Distillation Dashboard')]),
    );
  });
});
