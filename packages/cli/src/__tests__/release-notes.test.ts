import { generateReleaseNotes, formatReleaseNotes, ReleaseNotesResult } from '../release/notes';

jest.mock('node:child_process', () => ({
  execSync: jest.fn(),
}));
const mockExecSync = jest.requireMock('node:child_process').execSync;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateReleaseNotes', () => {
  it('deve classificar commits feat/fix/breaking/other', () => {
    mockExecSync.mockReturnValueOnce(
      'feat: add login page\nfix: fix crash on null\nBREAKING: change API\nchore: update deps\n'
    );
    const result = generateReleaseNotes('v1.0.0', 'v2.0.0', '/fake');
    expect(result.version).toBe('v2.0.0');
    expect(result.features).toHaveLength(1);
    expect(result.features[0]).toContain('add login page');
    expect(result.fixes).toHaveLength(1);
    expect(result.fixes[0]).toContain('fix crash on null');
    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0]).toContain('BREAKING: change API');
    expect(result.other).toHaveLength(1);
    expect(result.other[0]).toContain('update deps');
  });

  it('deve usar fallback git log quando range falha', () => {
    mockExecSync.mockImplementationOnce(() => { throw new Error('range error'); });
    mockExecSync.mockReturnValueOnce('fix: fallback commit\n');
    const result = generateReleaseNotes('v1.0.0', 'v2.0.0', '/fake');
    expect(result.fixes).toHaveLength(1);
  });

  it('deve lidar com git log totalmente indisponivel', () => {
    mockExecSync.mockImplementation(() => { throw new Error('no git'); });
    const result = generateReleaseNotes('v1.0.0', 'v2.0.0', '/fake');
    expect(result.features[0]).toContain('N/A');
  });

  it('deve ignorar hash no inicio das mensagens', () => {
    mockExecSync.mockReturnValueOnce(
      'a1b2c3d feat: implementar cache\n'
    );
    const result = generateReleaseNotes('v1.0.0', 'v2.0.0', '/fake');
    expect(result.features[0]).not.toMatch(/^[a-f0-9]+\s/);
    expect(result.features[0]).toContain('implementar cache');
  });

  it('deve detectar !: como breaking change', () => {
    mockExecSync.mockReturnValueOnce('feat!: breaking change\n');
    const result = generateReleaseNotes('v1.0.0', 'v2.0.0', '/fake');
    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0]).toContain('breaking change');
  });
});

describe('formatReleaseNotes', () => {
  it('deve formatar release completa', () => {
    const notes: ReleaseNotesResult = {
      version: 'v2.0.0',
      date: '2026-07-10',
      features: ['feat: login'],
      fixes: ['fix: crash'],
      breakingChanges: ['BREAKING: api change'],
      other: ['chore: deps'],
    };
    const output = formatReleaseNotes(notes);
    expect(output).toContain('# Release v2.0.0');
    expect(output).toContain('[BREAKING] Breaking Changes');
    expect(output).toContain('[FEATURE] Features');
    expect(output).toContain('[FIX] Bug Fixes');
    expect(output).toContain('[OTHER] Outras Mudancas');
  });

  it('deve omitir secoes vazias', () => {
    const notes: ReleaseNotesResult = {
      version: 'v1.0.0',
      date: '2026-07-10',
      features: [],
      fixes: [],
      breakingChanges: [],
      other: ['chore: deps'],
    };
    const output = formatReleaseNotes(notes);
    expect(output).not.toContain('[BREAKING]');
    expect(output).not.toContain('[FEATURE]');
    expect(output).not.toContain('[FIX]');
    expect(output).toContain('[OTHER]');
  });

  it('deve funcionar com notas vazias', () => {
    const notes: ReleaseNotesResult = {
      version: 'v0.0.0',
      date: '2026-01-01',
      features: [],
      fixes: [],
      breakingChanges: [],
      other: [],
    };
    const output = formatReleaseNotes(notes);
    expect(output).toContain('# Release v0.0.0');
  });
});
