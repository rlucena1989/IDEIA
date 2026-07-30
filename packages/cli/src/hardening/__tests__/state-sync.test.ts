import { syncStateToFile, getDefaultStatePath } from '../state-sync';

jest.mock('node:fs');

import fs from 'node:fs';

beforeEach(() => {
  jest.clearAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(true);
  (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
  (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
});

describe('syncStateToFile', () => {
  it('should write state to file', () => {
    const state = { projectName: 'test', status: 'active' };
    const result = syncStateToFile(state as unknown, '/tmp/.ai/state.json');
    expect(result.written).toBe(true);
    expect(result.path).toBe('/tmp/.ai/state.json');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should create directory if it does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const result = syncStateToFile({} as unknown, '/new/dir/state.json');
    expect(result.written).toBe(true);
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  it('should return error when write fails', () => {
    (fs.writeFileSync as jest.Mock).mockImplementation(() => { throw new Error('Disk full'); });
    const result = syncStateToFile({} as unknown, '/path/state.json');
    expect(result.written).toBe(false);
    expect(result.error).toBe('Disk full');
  });

  it('should stringify state as formatted JSON', () => {
    syncStateToFile({ key: 'value' } as unknown, '/path/state.json');
    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const writtenContent = writeCall[1];
    expect(() => JSON.parse(writtenContent)).not.toThrow();
    const parsed = JSON.parse(writtenContent);
    expect(parsed.key).toBe('value');
  });
});

describe('getDefaultStatePath', () => {
  it('should return path under .ai directory', () => {
    const result = getDefaultStatePath('/project');
    expect(result).toContain('.ai');
    expect(result).toContain('state.json');
  });

  it('should be within project root', () => {
    const result = getDefaultStatePath('/my/project/root');
    expect(result).toContain('.ai');
    expect(result).toContain('state.json');
  });
});