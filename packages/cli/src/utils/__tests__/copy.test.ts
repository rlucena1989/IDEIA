import path from 'node:path';
import { copyTemplateDirectory } from '../copy';
import fs from 'node:fs';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
  mkdirSync: jest.fn(),
  copyFileSync: jest.fn(),
}));

const mockedFs = jest.mocked(fs);
const SRC = path.join('', 'test', 'source');
const DST = path.join('', 'test', 'target');

function srcPath(file: string) {
  return path.join(SRC, file);
}
function dstPath(file: string) {
  return path.join(DST, file);
}

function isDir(p: string) {
  return p === SRC || p === DST;
}

describe('copy', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('copyTemplateDirectory', () => {
    it('should copy files in safe mode when destination does not exist', () => {
      const entries = ['file1.ts', 'file2.ts'];
      mockedFs.existsSync.mockImplementation((p) => {
        const pp = p.toString();
        return pp === SRC || entries.some(e => pp === srcPath(e));
      });
      mockedFs.statSync.mockImplementation((p) => {
        const pp = p.toString();
        return { isFile: () => !isDir(pp), isDirectory: () => isDir(pp), size: 100 } as any;
      });
      mockedFs.readdirSync.mockReturnValue(entries as any);

      const result = copyTemplateDirectory(SRC, DST, 'safe');
      expect(result.copied).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip existing files in safe mode', () => {
      const entry = 'file1.ts';
      mockedFs.existsSync.mockImplementation((p) => {
        const pp = p.toString();
        return pp === SRC || pp === srcPath(entry) || pp === dstPath(entry);
      });
      mockedFs.statSync.mockImplementation((p) => {
        const pp = p.toString();
        return { isFile: () => !isDir(pp), isDirectory: () => isDir(pp), size: 100 } as any;
      });
      mockedFs.readdirSync.mockReturnValue([entry] as any);

      const result = copyTemplateDirectory(SRC, DST, 'safe');
      expect(result.copied).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should overwrite existing files in force mode with backup', () => {
      const entry = 'file1.ts';
      mockedFs.existsSync.mockImplementation((p) => {
        const pp = p.toString();
        return pp === SRC || pp === srcPath(entry) || pp === dstPath(entry);
      });
      mockedFs.statSync.mockImplementation((p) => {
        const pp = p.toString();
        return { isFile: () => !isDir(pp), isDirectory: () => isDir(pp), size: 100 } as any;
      });
      mockedFs.readdirSync.mockReturnValue([entry] as any);

      const result = copyTemplateDirectory(SRC, DST, 'force');
      expect(result.overwritten).toHaveLength(1);
      expect(result.backedUp).toHaveLength(1);
      expect(result.copied).toHaveLength(0);
    });

    it('should not write anything in dry-run mode', () => {
      const entry = 'file1.ts';
      mockedFs.existsSync.mockImplementation((p) => {
        const pp = p.toString();
        return pp === SRC || pp === srcPath(entry);
      });
      mockedFs.statSync.mockImplementation((p) => {
        const pp = p.toString();
        return { isFile: () => !isDir(pp), isDirectory: () => isDir(pp), size: 100 } as any;
      });
      mockedFs.readdirSync.mockReturnValue([entry] as any);

      const result = copyTemplateDirectory(SRC, DST, 'dry-run');
      expect(result.copied).toHaveLength(1);
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
      expect(mockedFs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should apply filter function', () => {
      const entries = ['keep.ts', 'skip.ts'];
      mockedFs.existsSync.mockImplementation((p) => {
        const pp = p.toString();
        return pp === SRC || entries.some(e => pp === srcPath(e));
      });
      mockedFs.statSync.mockImplementation((p) => {
        const pp = p.toString();
        return { isFile: () => !isDir(pp), isDirectory: () => isDir(pp), size: 100 } as any;
      });
      mockedFs.readdirSync.mockReturnValue(entries as any);

      const filter = (relPath: string) => relPath === 'keep.ts';
      const result = copyTemplateDirectory(SRC, DST, 'safe', filter);
      expect(result.copied).toHaveLength(1);
      expect(result.copied[0]).toContain('keep.ts');
    });

    it('should handle errors gracefully', () => {
      mockedFs.existsSync.mockImplementation(() => { throw new Error('permission denied'); });
      const result = copyTemplateDirectory(SRC, DST, 'safe');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('permission denied');
    });
  });
});
