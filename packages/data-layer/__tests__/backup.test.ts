import { PostgresBackup, BackupResult } from '../src/backup';
import { execFile } from 'child_process';
import * as fs from 'fs';
jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  unlinkSync: jest.fn(),
  statSync: jest.fn(),
  renameSync: jest.fn(),
}));

const mockExecFile = execFile as unknown as jest.Mock;
const mockExistsSync = fs.existsSync as unknown as jest.Mock;
const mockMkdirSync = fs.mkdirSync as unknown as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as unknown as jest.Mock;
const mockReadFileSync = fs.readFileSync as unknown as jest.Mock;
const mockReaddirSync = fs.readdirSync as unknown as jest.Mock;
beforeEach(() => {
  jest.resetAllMocks();
  mockReaddirSync.mockReturnValue([]);
  mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
    cb(null, '', '');
    return {};
  });
  mockExistsSync.mockReturnValue(true);
  mockReadFileSync.mockReturnValue(Buffer.from(''));
});

describe('PostgresBackup', () => {
  describe('construction', () => {
    it('should construct with default config', () => {
      const backup = new PostgresBackup();
      const config = backup.getConfig();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('ideia');
      expect(config.user).toBe('ideia');
      expect(config.password).toBe('ideia');
      expect(config.backupDir).toBe('.deploy/backups/postgres');
      expect(config.retentionDays).toBe(30);
      expect(config.autoBackup).toBe(false);
      expect(config.backupIntervalMs).toBe(86400000);
      expect(config.compress).toBe(true);
    });

    it('should construct with custom config', () => {
      const backup = new PostgresBackup({
        host: 'db.example.com',
        port: 5433,
        database: 'mydb',
        user: 'admin',
        password: 'secret',
        backupDir: '/backups',
        retentionDays: 7,
        compress: false,
      });
      const config = backup.getConfig();
      expect(config.host).toBe('db.example.com');
      expect(config.port).toBe(5433);
      expect(config.database).toBe('mydb');
      expect(config.user).toBe('admin');
      expect(config.password).toBe('secret');
      expect(config.backupDir).toBe('/backups');
      expect(config.retentionDays).toBe(7);
      expect(config.compress).toBe(false);
    });

    it('should merge partial config with defaults', () => {
      const backup = new PostgresBackup({ database: 'testdb', compress: false });
      const config = backup.getConfig();
      expect(config.database).toBe('testdb');
      expect(config.compress).toBe(false);
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
    });
  });

  describe('setConfig / getConfig', () => {
    it('should update config via setConfig', () => {
      const backup = new PostgresBackup();
      backup.setConfig({ retentionDays: 14, backupDir: '/new/backups' });
      const config = backup.getConfig();
      expect(config.retentionDays).toBe(14);
      expect(config.backupDir).toBe('/new/backups');
      expect(config.host).toBe('localhost');
    });

    it('should return a copy of config from getConfig', () => {
      const backup = new PostgresBackup({ database: 'test' });
      const config = backup.getConfig();
      config.database = 'modified';
      expect(backup.getConfig().database).toBe('test');
    });
  });

  describe('runBackup', () => {
    beforeEach(() => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(null, 'SQL DUMP CONTENT', '');
        return {};
      });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(Buffer.from('SQL DUMP CONTENT'));
    });

    it('should succeed and return backup result with metadata', async () => {
      const backup = new PostgresBackup({ compress: false });
      const result = await backup.runBackup();

      expect(result.success).toBe(true);
      expect(result.path).toContain('ideia-backup-');
      expect(result.path).toContain('.sql');
      expect(result.path).not.toContain('.gz');
      expect(result.size).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should use compressed file extension when compress is true', async () => {
      const backup = new PostgresBackup({ compress: true });
      const result = await backup.runBackup();

      expect(result.success).toBe(true);
      expect(result.path).toContain('.sql.gz');
    });

    it('should call pg_dump with correct arguments', async () => {
      const backup = new PostgresBackup({
        host: 'dbhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        compress: true,
      });
      await backup.runBackup();

      expect(mockExecFile).toHaveBeenCalledWith(
        'pg_dump',
        expect.arrayContaining(['-h', 'dbhost', '-p', '5432', '-U', 'testuser', '-d', 'testdb', '--no-owner', '--no-acl', '-Z', '9']),
        expect.objectContaining({
          env: expect.objectContaining({ PGPASSWORD: 'testpass' }),
          encoding: 'utf-8',
        }),
        expect.any(Function),
      );
    });

    it('should create backup directory and write backup file', async () => {
      const backup = new PostgresBackup({ backupDir: '/custom/backups', compress: false });
      await backup.runBackup();

      expect(mockMkdirSync).toHaveBeenCalledWith('/custom/backups', { recursive: true });
      const writeCall = mockWriteFileSync.mock.calls[0];
      expect(writeCall[0]).toMatch(/ideia-backup-.+\.sql$/);
      expect(writeCall[1]).toBe('SQL DUMP CONTENT');
      expect(writeCall[2]).toBe('utf-8');
    });

    it('should write in binary mode when compress is true', async () => {
      const backup = new PostgresBackup({ compress: true });
      await backup.runBackup();

      expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('.sql.gz'), 'SQL DUMP CONTENT', 'binary');
    });

    it('should handle execFile error and return failure result', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(new Error('pg_dump not found'), '', '');
        return {};
      });

      const backup = new PostgresBackup();
      const result = await backup.runBackup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('pg_dump not found');
      expect(result.size).toBe(0);
    });

    it('should handle mkdirSync error gracefully', async () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const backup = new PostgresBackup();
      const result = await backup.runBackup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('restore', () => {
    beforeEach(() => {
      mockReadFileSync.mockReturnValue('RESTORE SQL CONTENT');
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(null, '', '');
        return { stdin: { write: jest.fn(), end: jest.fn() } };
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class BackupManager {
      constructor(...args: unknown[]) {}
    }

    it('should succeed and read file then pipe to psql', async () => {
      const backup = new PostgresBackup({ database: 'testdb', compress: false });
      const result = await backup.restore('/path/to/backup.sql');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/backup.sql', 'utf-8');
    });

    it('should call psql with correct arguments', async () => {
      const backup = new PostgresBackup({
        host: 'dbhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      });
      await backup.restore('/backup.sql');

      expect(mockExecFile).toHaveBeenCalledWith(
        'psql',
        expect.arrayContaining(['-h', 'dbhost', '-p', '5432', '-U', 'testuser', '-d', 'testdb']),
        expect.objectContaining({
          env: expect.objectContaining({ PGPASSWORD: 'testpass' }),
          timeout: 300000,
        }),
        expect.any(Function),
      );
    });

    it('should write content to stdin and end it', async () => {
      const stdinMock = { write: jest.fn(), end: jest.fn() };
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(null);
        return { stdin: stdinMock };
      });

      const backup = new PostgresBackup();
      await backup.restore('/backup.sql');

      expect(stdinMock.write).toHaveBeenCalledWith('RESTORE SQL CONTENT');
      expect(stdinMock.end).toHaveBeenCalled();
    });

    it('should read file in binary mode when compress is true', async () => {
      const backup = new PostgresBackup({ compress: true });
      mockReadFileSync.mockReturnValue(Buffer.from('compressed data'));
      await backup.restore('/backup.sql.gz');

      expect(mockReadFileSync).toHaveBeenCalledWith('/backup.sql.gz', 'binary');
    });

    it('should return failure when execFile errors', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(new Error('psql connection refused'), '', '');
        return { stdin: { write: jest.fn(), end: jest.fn() } };
      });

      const backup = new PostgresBackup();
      const result = await backup.restore('/backup.sql');

      expect(result.success).toBe(false);
      expect(result.error).toContain('psql connection refused');
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no backups performed', () => {
      const backup = new PostgresBackup();
      expect(backup.listBackups()).toEqual([]);
    });

    it('should return backup history after successful backup', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(null, 'data', '');
        return {};
      });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(Buffer.from('data'));

      const backup = new PostgresBackup({ compress: false });
      await backup.runBackup();

      const history = backup.listBackups();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
    });

    it('should return backup history including failed backups', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(new Error('fail'), '', '');
        return {};
      });

      const backup = new PostgresBackup();
      await backup.runBackup();

      const history = backup.listBackups();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
    });

    it('should return a copy of the history array', () => {
      const backup = new PostgresBackup();
      const history = backup.listBackups();
      history.push({} as unknown as BackupResult);
      expect(backup.listBackups()).toHaveLength(0);
    });
  });

  describe('auto backup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(null, 'data', '');
        return {};
      });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(Buffer.from('data'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start auto backup with configured interval', async () => {
      const backup = new PostgresBackup({ backupIntervalMs: 5000 });
      backup.startAutoBackup();
      expect(backup.listBackups()).toHaveLength(0);

      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(backup.listBackups()).toHaveLength(1);

      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(backup.listBackups()).toHaveLength(2);
    });

    it('should not start duplicate intervals', async () => {
      const backup = new PostgresBackup({ backupIntervalMs: 5000 });
      backup.startAutoBackup();
      backup.startAutoBackup();

      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(backup.listBackups()).toHaveLength(1);
    });

    it('should stop auto backup', async () => {
      const backup = new PostgresBackup({ backupIntervalMs: 5000 });
      backup.startAutoBackup();
      backup.stopAutoBackup();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();
      expect(backup.listBackups()).toHaveLength(0);
    });

    it('should be safe to call stopAutoBackup without starting', () => {
      const backup = new PostgresBackup();
      expect(() => backup.stopAutoBackup()).not.toThrow();
    });
  });
});
