import { releaseCommand, releasePipelineCommand as pipelineCommand } from '../release';

const mockIO = {
  fs: {
    cwd: jest.fn(() => process.cwd()),
    exists: jest.fn(() => false),
    read: jest.fn(() => ''),
    readDir: jest.fn(() => []),
    readDirEntries: jest.fn(() => []),
    readBuffer: jest.fn(() => Buffer.from('')),
    stat: jest.fn(() => ({ mtimeMs: Date.now(), size: 0, isDirectory: () => false })),
    write: jest.fn(),
    append: jest.fn(),
    mkDir: jest.fn(),
    ensureDir: jest.fn(),
    remove: jest.fn(),
    copy: jest.fn(),
  },
  shell: {
    exec: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
    execString: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
    spawn: jest.fn(() => ({ on: () => {}, pid: 0 })),
  },
  http: {
    get: jest.fn(() => Promise.resolve({ status: 200, data: null })),
    post: jest.fn(() => Promise.resolve({ status: 200, data: null })),
  },
};

jest.mock('../../io', () => ({
  getIO: jest.fn(() => mockIO),
  createIO: jest.fn(),
  resetIO: jest.fn(),
  MockIOContainer: class {},
  MockShell: class {},
  MockFileSystem: class {},
  MockHttpClient: class {},
}));

jest.mock('../../release/notes', () => ({
  generateReleaseNotes: jest.fn(),
  formatReleaseNotes: jest.fn(),
}));

jest.mock('../../release/preparer', () => ({
  prepareRelease: jest.fn(),
}));

jest.mock('../../release/publisher', () => ({
  publishRelease: jest.fn(),
}));

import { generateReleaseNotes, formatReleaseNotes } from '../../release/notes';
import { prepareRelease } from '../../release/preparer';
import { publishRelease } from '../../release/publisher';

const mockPrepare = prepareRelease as jest.Mock;
const mockPublish = publishRelease as jest.Mock;
const mockGenNotes = generateReleaseNotes as jest.Mock;
const mockFormatNotes = formatReleaseNotes as jest.Mock;

let exitSpy: jest.SpyInstance;
let logSpy: jest.SpyInstance;

beforeEach(() => {
  exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  mockPrepare.mockReset();
  mockPrepare.mockReturnValue({
    version: '1.2.3',
    tag: 'v1.2.3',
    changelogPath: 'CHANGELOG.md',
    previousVersion: '1.1.0',
    commitsSinceLast: 5,
  });

  mockPublish.mockReset();
  mockPublish.mockReturnValue({
    published: true,
    registry: 'npm',
    version: '1.2.3',
    artifacts: ['npm package'],
    errors: [],
  });

  mockGenNotes.mockReset();
  mockGenNotes.mockReturnValue({
    version: 'v1.2.3',
    date: '2026-07-26',
    features: ['feat: add login'],
    fixes: ['fix: null pointer'],
    breakingChanges: [],
    other: ['chore: deps'],
  });

  mockFormatNotes.mockReset();
  mockFormatNotes.mockReturnValue('# Release v1.2.3\n\n**Data:** 2026-07-26\n\n## Test');

  mockIO.fs.read.mockReset().mockReturnValue(JSON.stringify({ name: 'test-pkg', version: '1.2.3' }));
  mockIO.fs.exists.mockReset().mockReturnValue(false);
  mockIO.fs.write.mockReset();
  mockIO.fs.mkDir.mockReset();
  mockIO.shell.execString.mockReset().mockReturnValue({ status: 0, stdout: '', stderr: '' });
});

afterEach(() => {
  exitSpy.mockRestore();
  logSpy.mockRestore();
});

describe('releaseCommand', () => {
  it('creates a Command with correct description', () => {
    const cmd = releaseCommand();
    expect(cmd.name()).toBe('release');
    expect(cmd.description()).toContain('Automacao');
  });

  it('has prepare, publish, notes, changelog subcommands', () => {
    const cmd = releaseCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toEqual(expect.arrayContaining(['prepare', 'publish', 'notes', 'changelog']));
  });

  describe('prepare', () => {
    it('accepts valid semver and calls prepareRelease', () => {
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'prepare', '--ver', '2.0.0']);
      expect(mockPrepare).toHaveBeenCalledWith('2.0.0', undefined);
    });

    it('rejects invalid semver (non-numeric)', () => {
      mockPrepare.mockClear();
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'prepare', '--ver', 'abc']);
      expect(mockPrepare).not.toHaveBeenCalled();
    });

    it('rejects invalid semver (missing patch)', () => {
      mockPrepare.mockClear();
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'prepare', '--ver', '1.2']);
      expect(mockPrepare).not.toHaveBeenCalled();
    });

    it('handles --dry-run flag', () => {
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'prepare', '--ver', '1.2.3', '--dry-run']);
      expect(mockPrepare).toHaveBeenCalledWith('1.2.3', true);
    });
  });

  describe('publish', () => {
    it('reads package.json and calls publishRelease', () => {
      mockIO.fs.read.mockReturnValue(JSON.stringify({ version: '2.0.0' }));
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'publish']);
      expect(mockPublish).toHaveBeenCalledWith('2.0.0', undefined);
    });

    it('handles --dry-run flag', () => {
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'publish', '--dry-run']);
      expect(mockPublish).toHaveBeenCalledWith('1.2.3', true);
    });

    it('reports errors from publishRelease', () => {
      mockPublish.mockReturnValue({
        published: false, registry: 'npm', version: '1.2.3',
        artifacts: [], errors: ['npm publish: 403 Forbidden'],
      });
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'publish']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Erro'));
    });

    it('reports artifacts from publishRelease', () => {
      mockPublish.mockReturnValue({
        published: true, registry: 'npm', version: '1.2.3',
        artifacts: ['npm package'], errors: [],
      });
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'publish']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Publicado'));
    });
  });

  describe('notes', () => {
    it('generates release notes with default options', () => {
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'notes']);
      expect(mockGenNotes).toHaveBeenCalledWith('HEAD~10', 'HEAD');
      expect(mockFormatNotes).toHaveBeenCalled();
    });

    it('accepts --from and --to options', () => {
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'notes', '--from', 'v1.0.0', '--to', 'v2.0.0']);
      expect(mockGenNotes).toHaveBeenCalledWith('v1.0.0', 'v2.0.0');
    });

    it('saves to file when --out is provided', () => {
      mockIO.fs.write.mockClear();
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'notes', '--out', 'RELEASE.md']);
      expect(mockIO.fs.write).toHaveBeenCalled();
    });
  });

  describe('changelog', () => {
    it('generates changelog from git log to stdout', () => {
      mockIO.shell.execString.mockReturnValue({ status: 0, stdout: 'feat: new feature\nfix: bug fix\nchore: cleanup', stderr: '' });
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'changelog']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Changelog'));
    });

    it('saves to file when --out is provided', () => {
      mockIO.shell.execString.mockReturnValue({ status: 0, stdout: 'feat: new feature', stderr: '' });
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'changelog', '--out', 'CHANGELOG.md']);
      expect(mockIO.fs.write).toHaveBeenCalled();
    });

    it('handles empty git log', () => {
      mockIO.shell.execString.mockReturnValue({ status: 0, stdout: '', stderr: '' });
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'changelog']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('# Changelog'));
    });

    it('categorizes commits by type', () => {
      mockIO.shell.execString.mockReturnValue({
        status: 0,
        stdout: 'feat: feature1\nfix: fix1\nBREAKING: break1\n!:: breaking2\nchore: other1',
        stderr: '',
      });
      const cmd = releaseCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'changelog']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('## Features'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('## Bug Fixes'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('## Breaking Changes'));
    });
  });
});

describe('pipelineCommand', () => {
  it('creates a Command with correct description', () => {
    const cmd = pipelineCommand();
    expect(cmd.name()).toBe('pipeline');
    expect(cmd.description()).toContain('Geracao');
  });

  it('has generate and run subcommands', () => {
    const cmd = pipelineCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toEqual(expect.arrayContaining(['generate', 'run']));
  });

  describe('generate', () => {
    it('generates all pipeline files by default', () => {
      mockIO.fs.write.mockClear();
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate']);
      expect(mockIO.fs.write).toHaveBeenCalled();
      expect(mockIO.fs.mkDir).toHaveBeenCalled();
    });

    it('generates only github when --github is specified', () => {
      mockIO.fs.write.mockClear();
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate', '--github']);
      expect(mockIO.fs.write).toHaveBeenCalledWith(
        expect.stringContaining('.github'),
        expect.any(String),
      );
    });

    it('generates only docker when --docker is specified', () => {
      mockIO.fs.write.mockClear();
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate', '--docker']);
      expect(mockIO.fs.write).toHaveBeenCalledWith(
        expect.stringContaining('Dockerfile'),
        expect.any(String),
      );
    });

    it('generates only k8s when --k8s is specified', () => {
      mockIO.fs.write.mockClear();
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate', '--k8s']);
      expect(mockIO.fs.write).toHaveBeenCalledWith(
        expect.stringContaining('k8s'),
        expect.any(String),
      );
    });

    it('skips existing files without --force', () => {
      mockIO.fs.exists.mockReturnValue(true);
      mockIO.fs.write.mockClear();
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate', '--github']);
      expect(mockIO.fs.write).not.toHaveBeenCalledWith(
        expect.stringContaining('.github'),
        expect.any(String),
      );
    });

    it('overwrites existing files with --force', () => {
      mockIO.fs.exists.mockReturnValue(true);
      mockIO.fs.write.mockClear();
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate', '--github', '--force']);
      expect(mockIO.fs.write).toHaveBeenCalledWith(
        expect.stringContaining('.github'),
        expect.any(String),
      );
    });

    it('does not write files in --dry-run mode', () => {
      mockIO.fs.write.mockClear();
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate', '--docker', '--dry-run']);
      expect(mockIO.fs.write).not.toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('runs pipeline steps and reports success', () => {
      mockIO.shell.execString.mockReturnValue({ status: 0, stdout: 'success', stderr: '' });
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'run', 'test-workflow']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('npm ci'));
    });

    it('reports failure when install step fails', () => {
      mockIO.shell.execString.mockReturnValue({ status: 1, stdout: '', stderr: 'error' });
      const cmd = pipelineCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'run', 'test-workflow']);
      expect(mockIO.shell.execString).toHaveBeenCalledWith(
        expect.stringContaining('ci'),
        expect.any(String),
      );
    });
  });
});
