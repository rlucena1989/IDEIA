import { modeCommand, modeSetAction, modeCurrentAction, VALID_MODES } from '../mode';
import { printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');

import { getIO } from '../../io';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  mockFs.exists.mockReturnValue(false);
});

describe('VALID_MODES', () => {
  it('deve conter 6 modos', () => {
    expect(VALID_MODES).toHaveLength(6);
    expect(VALID_MODES).toContain('development');
    expect(VALID_MODES).toContain('security');
  });
});

describe('modeSetAction', () => {
  it('deve definir modo valido', () => {
    modeSetAction('security');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('security'), true);
  });

  it('deve rejeitar modo invalido', () => {
    modeSetAction('invalid-mode');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('invalido'), false);
  });
});

describe('modeCurrentAction', () => {
  it('deve exibir modo atual', () => {
    modeCurrentAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('development'));
  });
});

describe('modeCommand', () => {
  it('should be defined', () => {
    expect(modeCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = modeCommand();
    expect(cmd.name()).toBe('mode');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('set');
    expect(names).toContain('current');
  });
});
