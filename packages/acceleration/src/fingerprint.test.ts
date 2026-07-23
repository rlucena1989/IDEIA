import { createProjectFingerprint, createTextFingerprint } from './fingerprint';
import * as fs from 'node:fs';
import * as _path from 'node:path';
import _crypto from 'node:crypto';

jest.mock('node:fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('fingerprint', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create a deterministic text fingerprint', () => {
    const hash = createTextFingerprint('hello');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(createTextFingerprint('hello')).toBe(hash);
    expect(createTextFingerprint('world')).not.toBe(hash);
  });

  it('should create project fingerprint from files', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['file1.ts', 'file2.ts'] as unknown as ReturnType<typeof mockFs.readdirSync>);
    mockFs.statSync.mockReturnValue({ isDirectory: () => false } as fs.Stats);
    mockFs.readFileSync.mockReturnValue(Buffer.from('content'));

    const result = createProjectFingerprint('/project');
    expect(result.files).toBe(2);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should skip excluded directories', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['node_modules', 'src'] as unknown as ReturnType<typeof mockFs.readdirSync>);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);

    const result = createProjectFingerprint('/project');
    expect(result.files).toBe(0);
  });

  it('should return empty result for non-existent directory', () => {
    mockFs.existsSync.mockReturnValue(false);
    const result = createProjectFingerprint('/nonexistent');
    expect(result.files).toBe(0);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle read errors gracefully', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync
      .mockReturnValueOnce(['file1.ts'] as unknown as ReturnType<typeof mockFs.readdirSync>)
      .mockReturnValueOnce([] as unknown as ReturnType<typeof mockFs.readdirSync>);
    mockFs.statSync.mockReturnValue({ isDirectory: () => false } as fs.Stats);
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const result = createProjectFingerprint('/project');
    expect(result.files).toBe(1);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });
});