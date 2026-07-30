import { Command } from 'commander';
import { docsCommand } from '../docs';

jest.mock('../../knowledge/knowledge-base', () => ({
  KnowledgeBase: jest.fn().mockImplementation(() => ({ list: jest.fn().mockReturnValue([]) })),
}));
jest.mock('../../knowledge/knowledge-types', () => ({
  createKnowledgeEntry: jest.fn().mockReturnValue({ id: 'entry-1' }),
}));
jest.mock('../../knowledge/doc-generator', () => ({
  generateMarkdownDocs: jest.fn().mockReturnValue('# Generated Docs'),
  buildDocumentationArtifact: jest.fn().mockImplementation((_: any, name: string, version: string) => ({
    name, type: 'markdown', version, content: '<doc>test</doc>'.repeat(100),
  })),
}));
jest.mock('../../knowledge/doc-sync', () => ({
  syncDocumentation: jest.fn().mockReturnValue({ syncedCount: 3, timestamp: '2026-07-26T00:00:00.000Z' }),
}));
jest.mock('../../domain/doc-service', () => ({
  handleDocResolve: jest.fn(),
  handleDocAudit: jest.fn(),
  handleDocSources: jest.fn(),
  handleDocPolicy: jest.fn(),
  handleDocStatus: jest.fn(),
}));
jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn().mockImplementation((data: any) => data),
}));
jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));
jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn().mockReturnValue('1.0.0-test'),
}));

function service() { return require('../../domain/doc-service'); }
function output() { return require('../../utils/output'); }

describe('docsCommand', () => {
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function makeCmd() { return docsCommand(); }

  it('returns a Commander Command with name docs', () => {
    const cmd = makeCmd();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('docs');
  });

  it('has all expected subcommands', () => {
    const names = makeCmd().commands.map(c => c.name());
    expect(names).toContain('resolve');
    expect(names).toContain('audit');
    expect(names).toContain('sources');
    expect(names).toContain('policy');
    expect(names).toContain('status');
    expect(names).toContain('generate');
    expect(names).toContain('sync');
    expect(names).toContain('publish');
  });

  it('has description', () => {
    expect(makeCmd().description()).toBeTruthy();
  });

  it('resolve subcommand shows success info', () => {
    service().handleDocResolve.mockReturnValueOnce({ ok: true, message: 'Document resolved', data: { primary: { path: 'docs/guide.md', category: 'task', priority: 1 }, fallbacks: [] } });
    makeCmd().commands.find(c => c.name() === 'resolve')!.parse(['resolve', 'feature'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Document resolved'));
  });

  it('resolve subcommand shows blocked with fallbacks', () => {
    service().handleDocResolve.mockReturnValueOnce({ ok: false, message: 'No primary document', error: { details: { fallbacks: [{ id: 'fb-1', path: 'docs/alt.md', priority: 2 }] } } });
    makeCmd().commands.find(c => c.name() === 'resolve')!.parse(['resolve', 'feature'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Bloqueado'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Fallbacks disponíveis'));
  });

  it('audit subcommand shows clean status', () => {
    service().handleDocAudit.mockReturnValueOnce({ data: { conflicts: [], status: 'clean' } });
    makeCmd().commands.find(c => c.name() === 'audit')!.parse(['audit'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Clean'));
  });

  it('audit subcommand shows conflicts', () => {
    service().handleDocAudit.mockReturnValueOnce({ data: { conflicts: [{ severity: 'critical', taskType: 'feature', reason: 'Duplicate', documents: ['a.md', 'b.md'], recommendation: 'Merge' }], status: 'blocked' } });
    makeCmd().commands.find(c => c.name() === 'audit')!.parse(['audit'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked'));
  });

  it('audit subcommand prints JSON output', () => {
    service().handleDocAudit.mockReturnValueOnce({ data: { conflicts: [{ severity: 'high', taskType: 'bug', reason: 'Conflict', documents: ['x.md'], recommendation: 'Fix' }], status: 'warning' } });
    makeCmd().commands.find(c => c.name() === 'audit')!.parse(['--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.conflicts).toHaveLength(1);
  });

  it('sources subcommand prints list', () => {
    service().handleDocSources.mockReturnValueOnce({ data: { documents: [{ id: 'doc-1', title: 'Guide', path: 'docs/guide.md', category: 'task', priority: 1, tags: ['core'] }] } });
    makeCmd().commands.find(c => c.name() === 'sources')!.parse(['sources'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('doc-1'));
  });

  it('sources subcommand prints JSON output', () => {
    service().handleDocSources.mockReturnValueOnce({ data: { documents: [{ id: 'doc-1', title: 'Guide', path: 'guide.md', category: 'task', priority: 1, tags: [] }] } });
    makeCmd().commands.find(c => c.name() === 'sources')!.parse(['--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(1);
  });

  it('policy subcommand shows single policy', () => {
    service().handleDocPolicy.mockReturnValueOnce({ data: { policies: [{ primaryDocument: 'doc.md', conflictRule: 'override', executionMode: 'auto', requiresApproval: false, taskType: 'feature' }] } });
    makeCmd().commands.find(c => c.name() === 'policy')!.parse(['policy', 'feature'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Política para'));
  });

  it('policy subcommand shows no policies found', () => {
    service().handleDocPolicy.mockReturnValueOnce({ data: { policies: [] } });
    makeCmd().commands.find(c => c.name() === 'policy')!.parse(['policy', 'nonexistent'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhuma política'));
  });

  it('policy subcommand shows multiple policies', () => {
    service().handleDocPolicy.mockReturnValueOnce({ data: { policies: [{ primaryDocument: 'doc1.md', conflictRule: 'override', executionMode: 'auto', requiresApproval: false, taskType: 'feature' }, { primaryDocument: 'doc2.md', conflictRule: 'merge', executionMode: 'manual', requiresApproval: true, taskType: 'bug' }] } });
    makeCmd().commands.find(c => c.name() === 'policy')!.parse(['policy'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Políticas documentais'));
  });

  it('status subcommand shows governance status', () => {
    service().handleDocStatus.mockReturnValueOnce({ data: { totalDocuments: 10, totalPolicies: 5, conflicts: 2, status: 'warning' } });
    makeCmd().commands.find(c => c.name() === 'status')!.parse(['status'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Governança Documental'));
  });

  it('generate subcommand prints text output', () => {
    makeCmd().commands.find(c => c.name() === 'generate')!.parse(['generate'], { from: 'user' });
    expect(output().printHeader).toHaveBeenCalledWith('Documentação Viva');
  });

  it('generate subcommand prints JSON output', () => {
    makeCmd().commands.find(c => c.name() === 'generate')!.parse(['--json'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalled();
    const parsed = JSON.parse(output().printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('docs generate');
  });

  it('sync subcommand prints text output', () => {
    makeCmd().commands.find(c => c.name() === 'sync')!.parse(['sync'], { from: 'user' });
    expect(output().printHeader).toHaveBeenCalledWith('Sincronização de Documentação');
  });

  it('sync subcommand prints JSON output', () => {
    makeCmd().commands.find(c => c.name() === 'sync')!.parse(['--json'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalled();
    const parsed = JSON.parse(output().printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('docs sync');
    expect(parsed.data.syncedCount).toBe(3);
  });

  it('publish subcommand prints text output', () => {
    makeCmd().commands.find(c => c.name() === 'publish')!.parse(['publish', '1.0.0'], { from: 'user' });
    expect(output().printHeader).toHaveBeenCalledWith('Publicação de Documentação');
  });

  it('publish subcommand prints JSON output', () => {
    makeCmd().commands.find(c => c.name() === 'publish')!.parse(['2.0.0', '--json'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalled();
    const parsed = JSON.parse(output().printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('docs publish');
    expect(parsed.data.artifact.version).toBe('2.0.0');
  });
});
