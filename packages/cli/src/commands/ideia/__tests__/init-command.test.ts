const mockExistsSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  readFileSync: mockReadFileSync,
}));

jest.mock('../../detect', () => ({
  detectStack: jest.fn(() => ({ languages: ['TypeScript'], frameworks: [] })),
}));

jest.mock('../../init', () => ({
  ALLOWED_FLAVORS: ['nextjs', 'nestjs', 'react', 'vue'],
  TEMPLATES: ['nextjs-fullstack', 'nestjs-api', 'react-spa'],
}));

import { ideiaInitCommand } from '../init-command';

function makeAction(opts: Record<string, unknown> = {}) {
  const cmd = ideiaInitCommand();
  (cmd as any)._optionValues = opts;
  return (cmd as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('init action', () => {
  it('runs dry-run', () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction({ dryRun: true, stack: 'nextjs', database: 'postgres' })(['my-project']);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('DRY-RUN'));
    expect(mockMkdirSync).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it('creates project directory', () => {
    mockExistsSync.mockReturnValue(false);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction({ stack: 'nextjs', database: 'postgres' })(['my-project']);
    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it('requires --force when directory exists', () => {
    mockExistsSync.mockReturnValue(true);
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const spyExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    makeAction({})(['existing-project']);
    expect(spyError).toHaveBeenCalledWith(expect.stringContaining('já existe'));
    spyExit.mockRestore();
    spyError.mockRestore();
  });
});
