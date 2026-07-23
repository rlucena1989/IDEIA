import { backupStatusCommand, backupConfigureGithubCommand, backupStatusAction, backupConfigureGithubAction } from '../backup';

jest.mock('../../utils/output');
jest.mock(
  require('node:path').join(process.cwd(), '.ai/bin/backup-manager.js'),
  () => ({
    status: jest.fn().mockReturnValue({ sizeMB: 10, quotaMB: 100, percentUsed: 10, githubEnabled: false, githubRemote: '', archiveCount: 5 }),
    configureGithub: jest.fn(),
  }),
  { virtual: true }
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('backupStatusAction', () => {
  it('deve executar sem erro quando backup-manager existe', () => {
    jest.spyOn(console, 'log').mockImplementation();
    backupStatusAction();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Status'));
  });
});

describe('backupConfigureGithubAction', () => {
  it('deve configurar github com URL valida', () => {
    jest.spyOn(console, 'log').mockImplementation();
    backupConfigureGithubAction('https://github.com/user/repo.git');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GitHub'));
  });
});

describe('backupStatusCommand', () => {
  it('should be defined and have correct structure', () => {
    const cmd = backupStatusCommand();
    expect(cmd.name()).toBe('backup-status');
    expect(cmd.description()).toContain('Backup');
  });
});

describe('backupConfigureGithubCommand', () => {
  it('should be defined and have correct structure', () => {
    const cmd = backupConfigureGithubCommand();
    expect(cmd.name()).toBe('backup-configure-github');
    expect(cmd.description()).toContain('GitHub');
  });
});
