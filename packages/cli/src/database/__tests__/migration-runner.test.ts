jest.mock('node:child_process');
jest.mock('node:fs');

import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import { runMigrations, createMigration, getMigrationStatus, resetDatabase } from '../migration-runner';

const mockExecFile = execFile as unknown as jest.Mock;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('migration-runner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: object, cb: Function) => {
      cb(null, 'migration output', '');
      return {} as never;
    });
  });

  describe('runMigrations', () => {
    it('calls prisma migrate dev for prisma orm', async () => {
      const result = await runMigrations('/project', 'prisma');
      expect(result.ok).toBe(true);
      expect(result.output).toBe('migration output');
      expect(mockExecFile).toHaveBeenCalledWith(
        'npx',
        ['prisma', 'migrate', 'dev'],
        expect.objectContaining({ cwd: '/project' }),
        expect.any(Function),
      );
    });

    it('calls typeorm migration:run for typeorm orm', async () => {
      await runMigrations('/project', 'typeorm');
      expect(mockExecFile).toHaveBeenCalledWith(
        'npx',
        ['typeorm', 'migration:run'],
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('calls drizzle-kit push:pg for drizzle orm', async () => {
      await runMigrations('/project', 'drizzle');
      expect(mockExecFile).toHaveBeenCalledWith(
        'npx',
        ['drizzle-kit', 'push:pg'],
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('returns error result when execFile fails', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: object, cb: Function) => {
        cb(new Error('db error'), '', '');
        return {} as never;
      });

      const result = await runMigrations('/project');
      expect(result.ok).toBe(false);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createMigration', () => {
    it('sanitizes migration name replacing special characters', async () => {
      await createMigration('/project', 'add user table!@#', 'prisma');
      expect(mockExecFile).toHaveBeenCalledWith(
        'npx',
        ['prisma', 'migrate', 'dev', '--name', 'add_user_table___'],
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('returns success with output', async () => {
      const result = await createMigration('/project', 'my_migration');
      expect(result.ok).toBe(true);
      expect(result.output).toBe('migration output');
    });
  });

  describe('resetDatabase', () => {
    it('calls prisma migrate reset --force for prisma orm', async () => {
      await resetDatabase('/project');
      expect(mockExecFile).toHaveBeenCalledWith(
        'npx',
        ['prisma', 'migrate', 'reset', '--force'],
        expect.objectContaining({ cwd: '/project' }),
        expect.any(Function),
      );
    });
  });

  describe('getMigrationStatus', () => {
    it('returns empty array when migrations directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(getMigrationStatus('/project')).toEqual([]);
    });

    it('parses migration directory entries', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['20260101_init', '20260102_add_table'] as never);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as never);

      const status = getMigrationStatus('/project');
      expect(status).toHaveLength(2);
      expect(status[0].name).toBe('20260101_init');
      expect(status[0].applied).toBe(true);
      expect(status[0].timestamp).toBe('20260101');
    });
  });
});
