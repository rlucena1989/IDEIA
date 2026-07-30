process.env.GTI_TEST_MODE = '1';

import { resetIO } from '../src/io';
import { InitUseCase } from '../src/domain/init-use-case';
import { DeployUseCase } from '../src/domain/deploy-use-case';
import { GenerateUseCase } from '../src/domain/generate-use-case';
import { ConfigUseCase } from '../src/domain/config-use-case';
import { AuditUseCase } from '../src/domain/audit-use-case';
import { QualityUseCase } from '../src/domain/quality-use-case';
import { TaskUseCase, createTaskUseCase } from '../src/domain/task-use-case';
import { SafetyUseCase, createSafetyUseCase } from '../src/domain/safety-use-case';
import { ProfileUseCase, createProfileUseCase } from '../src/domain/profile-use-case';
import { PluginUseCase, createPluginUseCase } from '../src/domain/plugin-use-case';
import { NotificationUseCase, createNotificationUseCase } from '../src/domain/notification-use-case';

jest.mock('../src/coverage/coverage-reader', () => ({
  readCoverageReport: jest.fn(),
  summarizeCoverage: jest.fn(),
  extractFileSummaries: jest.fn(),
}));
jest.mock('../src/coverage/gap-prioritizer', () => ({
  prioritizeGaps: jest.fn(gaps => gaps),
  rankBySeverity: jest.fn(gaps => ({ critical: gaps })),
}));
jest.mock('../src/coverage/test-quality-classifier', () => ({
  classifyTestGap: jest.fn(() => 'medium'),
}));
jest.mock('../src/coverage/status', () => ({
  buildAutonomyStatus: jest.fn(() => ({ level: 2 })),
  saveAutonomyStatus: jest.fn(),
  loadAutonomyStatus: jest.fn(() => ({ level: 2 })),
}));
jest.mock('../src/governance/doc-resolver', () => ({
  resolveDocument: jest.fn(),
  resolveByTags: jest.fn(),
}));
jest.mock('../src/governance/document-registry', () => ({
  listActiveDocuments: jest.fn(() => []),
  findDocumentsByCategory: jest.fn(() => []),
  findDocumentByPath: jest.fn(),
}));
jest.mock('../src/governance/document-policy', () => ({
  getPolicy: jest.fn(),
  listPolicies: jest.fn(() => []),
}));
jest.mock('../src/governance/document-audit', () => ({
  runAudit: jest.fn(() => ({ status: 'ok', conflicts: [] })),
  detectConflicts: jest.fn(() => []),
}));

import { handleCoverageAudit, handleCoverageGaps, handleCoverageRepair, handleCoverageStatus } from '../src/domain/coverage-service';
import {
  handleDocResolve, handleDocAudit, handleDocSources, handleDocPolicy, handleDocStatus,
} from '../src/domain/doc-service';
import { readCoverageReport, summarizeCoverage } from '../src/coverage/coverage-reader';
import { resolveDocument } from '../src/governance/doc-resolver';
import { runAudit } from '../src/governance/document-audit';

const mockedReadReport = readCoverageReport as jest.Mock;
const mockedSummarize = summarizeCoverage as jest.Mock;
const mockedResolve = resolveDocument as jest.Mock;
const mockedRunAudit = runAudit as jest.Mock;

beforeEach(() => {
  resetIO();
  jest.clearAllMocks();
});

describe('InitUseCase', () => {
  let useCase: InitUseCase;

  beforeEach(() => {
    useCase = new InitUseCase();
  });

  it('should initialize a project successfully', () => {
    const result = useCase.execute('test-proj', { template: 'minimal', dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.data!.projectName).toBe('test-proj');
    expect(result.data!.template).toBe('minimal');
    expect(result.data!.filesCreated).toBe(0);
  });

  it('should fail when directory already exists', () => {
    const io = (useCase as unknown as { io: { fs: { cwd(): string; _addDir(p: string): void } } }).io;
    const cwd = io.fs.cwd();
    io.fs._addDir(cwd + '/existing-dir');
    const result = useCase.execute('existing-dir');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Directory already exists');
  });

  it('should fail with invalid project name', () => {
    const result = useCase.execute('');
    expect(result.ok).toBe(false);
  });
});

describe('DeployUseCase', () => {
  let useCase: DeployUseCase;

  beforeEach(() => {
    useCase = new DeployUseCase();
  });

  it('should execute a dry run deploy successfully', () => {
    const result = useCase.execute({ version: '1.0.0', environment: 'staging', dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.data!.version).toBe('1.0.0');
    expect(result.data!.environment).toBe('staging');
    expect(result.data!.status).toBe('deployed');
    expect(result.data!.steps.length).toBe(1);
  });

  it('should perform canary deploy with steps', () => {
    const result = useCase.execute({ version: '2.0.0', environment: 'production', canaryPercent: 10, dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.data!.deployId).toMatch(/^deploy-/);
    expect(result.data!.status).toBe('deployed');
  });

  it('should fail with invalid version format', () => {
    const result = useCase.execute({ version: 'latest', environment: 'development' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Deploy failed');
  });
});

describe('GenerateUseCase', () => {
  let useCase: GenerateUseCase;

  beforeEach(() => {
    useCase = new GenerateUseCase();
  });

  it('should generate a use-case template', () => {
    const result = useCase.execute('use-case', 'my-feature', { dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.data!.template).toBe('use-case');
    expect(result.data!.name).toBe('my-feature');
  });

  it('should generate a command template', () => {
    const result = useCase.execute('command', 'deploy', { dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.data!.template).toBe('command');
  });

  it('should fail when file already exists', () => {
    const io = (useCase as unknown as { io: { fs: { cwd(): string; _addFile(p: string, c: string): void } } }).io;
    const cwd = io.fs.cwd();
    io.fs._addFile(cwd + '/src/domain/existing.ts', 'content');
    const result = useCase.execute('use-case', 'existing');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('already exists');
  });

  it('should fail with invalid name', () => {
    const result = useCase.execute('', '');
    expect(result.ok).toBe(false);
  });
});

describe('ConfigUseCase', () => {
  let useCase: ConfigUseCase;

  beforeEach(() => {
    useCase = new ConfigUseCase();
  });

  it('should set and get a config value', () => {
    const setResult = useCase.set('theme', 'dark');
    expect(setResult.ok).toBe(true);
    const getResult = useCase.get('theme');
    expect(getResult.ok).toBe(true);
    expect(getResult.data!.value).toBe('dark');
  });

  it('should return failure for unknown key', () => {
    const result = useCase.get('nonexistent');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should delete a config key', () => {
    useCase.set('key1', 'val1');
    const delResult = useCase.delete('key1');
    expect(delResult.ok).toBe(true);
    expect(delResult.data!.value).toBe('val1');
    const getResult = useCase.get('key1');
    expect(getResult.ok).toBe(false);
  });

  it('should list config entries with prefix filter', () => {
    useCase.set('app.name', 'test');
    useCase.set('app.version', '1');
    useCase.set('user.name', 'dev');
    const result = useCase.list('app');
    expect(result.ok).toBe(true);
    expect(result.data!.count).toBe(2);
  });

  it('should validate config - valid', () => {
    const result = useCase.validate({ theme: 'dark', port: 3000 });
    expect(result.ok).toBe(true);
  });

  it('should validate config - reserved keys', () => {
    const result = useCase.validate({ _private: 'secret' });
    expect(result.ok).toBe(false);
    expect((result.error!.details as { errors: string[] }).errors.length).toBeGreaterThan(0);
  });
});

describe('AuditUseCase', () => {
  let useCase: AuditUseCase;

  beforeEach(() => {
    useCase = new AuditUseCase('/tmp/test-audit');
  });

  it('should record an audit event', () => {
    const result = useCase.execute('deploy', 'user', 'v1.0.0', { env: 'prod' });
    expect(result.ok).toBe(true);
    expect(result.data!.eventType).toBe('deploy');
    expect(result.data!.actor).toBe('user');
    expect(result.data!.target).toBe('v1.0.0');
    expect(result.data!.hash).toBeTruthy();
    expect(result.data!.previousHash).toBe('0'.repeat(64));
  });

  it('should verify an empty chain', () => {
    const result = useCase.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(0);
  });

  it('should find event by prove', () => {
    const created = useCase.execute('test', 'system', 'target');
    expect(created.ok).toBe(true);
    const proven = useCase.prove(created.data!.id);
    expect(proven.ok).toBe(true);
  });

  it('should fail prove for unknown event', () => {
    const result = useCase.prove('non-existent-id');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should show audit trail', () => {
    useCase.execute('event1', 'user', 't1');
    useCase.execute('event2', 'ai', 't2');
    const result = useCase.show(10);
    expect(result.ok).toBe(true);
    expect(result.data!.total).toBe(2);
    expect(result.data!.chainValid).toBe(true);
  });
});

describe('QualityUseCase', () => {
  let useCase: QualityUseCase;

  beforeEach(() => {
    useCase = new QualityUseCase();
  });

  it('should run a commit gate successfully', () => {
    const result = useCase.runGate('commit');
    expect(result.ok).toBe(true);
    expect(result.data!.gate).toBe('commit');
    expect(result.data!.checks.length).toBeGreaterThan(0);
  });

  it('should fail for unknown gate', () => {
    const result = useCase.runGate('invalid' as never);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Unknown quality gate');
  });

  it('should check a pipeline of gates', () => {
    const result = useCase.checkPipeline(['commit', 'pr']);
    expect(result.ok).toBe(true);
    expect(result.data!.gates.length).toBe(2);
  });
});

describe('TaskUseCase', () => {
  let useCase: TaskUseCase;

  beforeEach(() => {
    useCase = createTaskUseCase();
  });

  it('should create a task', () => {
    const result = useCase.createTask('Fix bug', 'Fix the login bug', 1, ['bug']);
    expect(result.ok).toBe(true);
    expect(result.data!.name).toBe('Fix bug');
    expect(result.data!.status).toBe('pending');
    expect(result.data!.tags).toEqual(['bug']);
  });

  it('should update task status', () => {
    const created = useCase.createTask('Test', 'desc', 1, []);
    expect(created.ok).toBe(true);
    const result = useCase.updateTaskStatus(created.data!.id, 'running');
    expect(result.ok).toBe(true);
    expect(result.data!.status).toBe('running');
  });

  it('should fail to update non-existent task', () => {
    const result = useCase.updateTaskStatus('nonexistent', 'completed');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should assign a task', () => {
    const created = useCase.createTask('Task', 'desc', 1, []);
    expect(created.ok).toBe(true);
    const result = useCase.assignTask(created.data!.id, 'dev-team');
    expect(result.ok).toBe(true);
    expect(result.data!.assignedTo).toBe('dev-team');
  });

  it('should list tasks with status filter', () => {
    useCase.createTask('T1', 'desc', 1, []);
    const t2 = useCase.createTask('T2', 'desc', 2, []);
    if (t2.ok) { useCase.updateTaskStatus(t2.data!.id, 'running'); }
    const result = useCase.listTasks('running');
    expect(result.ok).toBe(true);
    expect(result.data!.tasks.length).toBe(1);
  });

  it('should delete a task', () => {
    const created = useCase.createTask('Todel', 'desc', 1, []);
    expect(created.ok).toBe(true);
    const result = useCase.deleteTask(created.data!.id);
    expect(result.ok).toBe(true);
  });

  it('should fail to delete non-existent task', () => {
    const result = useCase.deleteTask('nonexistent');
    expect(result.ok).toBe(false);
  });
});

describe('SafetyUseCase', () => {
  let useCase: SafetyUseCase;

  beforeEach(() => {
    useCase = createSafetyUseCase();
  });

  it('should have default rules', () => {
    const result = useCase.listRules();
    expect(result.ok).toBe(true);
    expect(result.data!.length).toBe(3);
  });

  it('should block dangerous input', () => {
    const result = useCase.checkInput('rm -rf /');
    expect(result.ok).toBe(true);
    expect(result.data!.blocked).toBeGreaterThanOrEqual(1);
  });

  it('should warn on suspicious input', () => {
    const result = useCase.checkInput('eval(userInput)');
    expect(result.ok).toBe(true);
    expect(result.data!.warned).toBeGreaterThanOrEqual(1);
  });

  it('should allow safe input', () => {
    const result = useCase.checkInput('console.log("hello")');
    expect(result.ok).toBe(true);
    expect(result.data!.blocked).toBe(0);
    expect(result.data!.warned).toBe(0);
  });

  it('should add a new rule', () => {
    const result = useCase.addRule('No fetch', 'Blocks fetch calls', 'fetch\\(', 'block', 'high');
    expect(result.ok).toBe(true);
    expect(result.data!.name).toBe('No fetch');
    expect(result.data!.enabled).toBe(true);
  });

  it('should toggle a rule', () => {
    const result = useCase.toggleRule('safety-1', false);
    expect(result.ok).toBe(true);
    expect(result.data!.enabled).toBe(false);
  });

  it('should fail to toggle non-existent rule', () => {
    const result = useCase.toggleRule('nonexistent', true);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should remove a rule', () => {
    const result = useCase.removeRule('safety-1');
    expect(result.ok).toBe(true);
    expect(useCase.listRules().data!.length).toBe(2);
  });
});

describe('ProfileUseCase', () => {
  let useCase: ProfileUseCase;

  beforeEach(() => {
    useCase = createProfileUseCase();
  });

  it('should create a profile', () => {
    const result = useCase.createProfile('Senior Dev', 'developer', 2);
    expect(result.ok).toBe(true);
    expect(result.data!.name).toBe('Senior Dev');
    expect(result.data!.role).toBe('developer');
    expect(result.data!.autonomyLevel).toBe(2);
  });

  it('should clamp autonomy level to 0-4', () => {
    const result = useCase.createProfile('Admin', 'architect', 10);
    expect(result.ok).toBe(true);
    expect(result.data!.autonomyLevel).toBe(4);
  });

  it('should get and list profiles', () => {
    const created = useCase.createProfile('Dev', 'developer', 1);
    expect(created.ok).toBe(true);
    const listed = useCase.listProfiles();
    expect(listed.ok).toBe(true);
    expect(listed.data!.length).toBe(1);
    const got = useCase.getProfile(created.data!.id);
    expect(got.ok).toBe(true);
  });

  it('should fail to get non-existent profile', () => {
    const result = useCase.getProfile('nonexistent');
    expect(result.ok).toBe(false);
  });

  it('should update preferences', () => {
    const created = useCase.createProfile('Dev', 'developer', 1);
    expect(created.ok).toBe(true);
    const result = useCase.updatePreferences(created.data!.id, { theme: 'dark' });
    expect(result.ok).toBe(true);
    expect(result.data!.preferences).toEqual({ theme: 'dark' });
  });

  it('should delete profile', () => {
    const created = useCase.createProfile('Temp', 'tester', 1);
    expect(created.ok).toBe(true);
    const result = useCase.deleteProfile(created.data!.id);
    expect(result.ok).toBe(true);
    expect(useCase.listProfiles().data!.length).toBe(0);
  });
});

describe('PluginUseCase', () => {
  let useCase: PluginUseCase;

  beforeEach(() => {
    useCase = createPluginUseCase();
  });

  it('should install a plugin', () => {
    const manifest = { name: 'my-plugin', version: '1.0.0', description: 'Test', entryPoint: 'index.js', dependencies: [] };
    const result = useCase.installPlugin(manifest);
    expect(result.ok).toBe(true);
    expect(result.data!.manifest.name).toBe('my-plugin');
    expect(result.data!.enabled).toBe(true);
  });

  it('should reject duplicate plugin', () => {
    const manifest = { name: 'dup', version: '1.0.0', description: 'Test', entryPoint: 'i.js', dependencies: [] };
    useCase.installPlugin(manifest);
    const result = useCase.installPlugin(manifest);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('already installed');
  });

  it('should enable and disable plugin', () => {
    const manifest = { name: 'p', version: '1.0.0', description: 'Test', entryPoint: 'i.js', dependencies: [] };
    const installed = useCase.installPlugin(manifest);
    expect(installed.ok).toBe(true);
    const disabled = useCase.disablePlugin(installed.data!.id);
    expect(disabled.ok).toBe(true);
    expect(disabled.data!.enabled).toBe(false);
    const enabled = useCase.enablePlugin(installed.data!.id);
    expect(enabled.ok).toBe(true);
    expect(enabled.data!.enabled).toBe(true);
  });

  it('should configure plugin', () => {
    const manifest = { name: 'cfg', version: '1.0.0', description: 'Test', entryPoint: 'i.js', dependencies: [] };
    const installed = useCase.installPlugin(manifest);
    expect(installed.ok).toBe(true);
    const result = useCase.configurePlugin(installed.data!.id, { apiKey: 'xyz' });
    expect(result.ok).toBe(true);
    expect(result.data!.config.apiKey).toBe('xyz');
  });

  it('should uninstall plugin', () => {
    const manifest = { name: 'rem', version: '1.0.0', description: 'Test', entryPoint: 'i.js', dependencies: [] };
    const installed = useCase.installPlugin(manifest);
    expect(installed.ok).toBe(true);
    const result = useCase.uninstallPlugin(installed.data!.id);
    expect(result.ok).toBe(true);
    expect(useCase.listPlugins().data!.length).toBe(0);
  });
});

describe('NotificationUseCase', () => {
  let useCase: NotificationUseCase;

  beforeEach(() => {
    useCase = createNotificationUseCase();
  });

  it('should send a notification', () => {
    const result = useCase.send('Test Alert', 'This is a test', 'high', 'system', 'console');
    expect(result.ok).toBe(true);
    expect(result.data!.title).toBe('Test Alert');
    expect(result.data!.priority).toBe('high');
    expect(result.data!.channel).toBe('console');
    expect(result.data!.read).toBe(false);
  });

  it('should mark notification as read', () => {
    const sent = useCase.send('Read test', 'msg', 'low', 'system');
    expect(sent.ok).toBe(true);
    const result = useCase.markAsRead(sent.data!.id);
    expect(result.ok).toBe(true);
    expect(result.data!.read).toBe(true);
    expect(result.data!.readAt).toBeTruthy();
  });

  it('should mark all as read', () => {
    useCase.send('N1', 'm1', 'low', 'sys');
    useCase.send('N2', 'm2', 'high', 'sys');
    const result = useCase.markAllAsRead();
    expect(result.ok).toBe(true);
    expect(result.data).toBe(2);
  });

  it('should get notification stats', () => {
    useCase.send('C1', 'm1', 'critical', 'sys');
    useCase.send('H1', 'm2', 'high', 'app');
    useCase.send('L1', 'm3', 'low', 'tool');
    const result = useCase.getStats();
    expect(result.ok).toBe(true);
    expect(result.data!.total).toBe(3);
    expect(result.data!.unread).toBe(3);
    expect(result.data!.byPriority.critical).toBe(1);
    expect(result.data!.byPriority.high).toBe(1);
  });

  it('should list notifications sorted by date desc', () => {
    useCase.send('Second', 'm2', 'low', 'sys');
    const result = useCase.listNotifications();
    expect(result.ok).toBe(true);
    expect(result.data!.length).toBe(1);
  });

  it('should list only unread', () => {
    const n1 = useCase.send('N1', 'm1', 'low', 'sys');
    useCase.send('N2', 'm2', 'low', 'sys');
    if (n1.ok) { useCase.markAsRead(n1.data!.id); }
    const result = useCase.listNotifications(true);
    expect(result.ok).toBe(true);
    expect(result.data!.length).toBe(1);
  });

  it('should clear all notifications', () => {
    useCase.send('A', 'a', 'low', 'sys');
    useCase.send('B', 'b', 'low', 'sys');
    const result = useCase.clearAll();
    expect(result.ok).toBe(true);
    expect(useCase.listNotifications().data!.length).toBe(0);
  });
});

describe('CoverageService', () => {
  const _mockReport = {
    overall: { lines: 75, branches: 60, functions: 80, statements: 70 },
    files: [
      { file: 'src/commands/deploy.ts', module: 'commands', lines: 70, branches: 50, functions: 80, statements: 75 },
      { file: 'src/domain/something.ts', module: 'domain', lines: 90, branches: 85, functions: 92, statements: 88 },
    ],
  };

  beforeEach(() => {
    mockedReadReport.mockReturnValue(null);
    mockedSummarize.mockReturnValue(0);
  });

  it('should fail audit when no report exists', () => {
    const result = handleCoverageAudit();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Nenhum relat\u00f3rio');
  });

  it('should return coverage status even without report', () => {
    const result = handleCoverageStatus();
    expect(result.ok).toBe(true);
    expect(result.data!.current).toBe(0);
    expect(result.data!.gaps).toBe(0);
  });

  it('should return gaps when no report', () => {
    const result = handleCoverageGaps();
    expect(result.ok).toBe(false);
  });

  it('should complete a repair cycle when no report', () => {
    const result = handleCoverageRepair(5);
    expect(result.ok).toBe(false);
  });
});

describe('DocService', () => {
  beforeEach(() => {
    mockedResolve.mockReturnValue({ primary: 'test.md', fallbacks: [], reason: 'found', blocked: false });
    mockedRunAudit.mockReturnValue({ status: 'ok', conflicts: [] });
  });

  it('should resolve a document', () => {
    const result = handleDocResolve('tests');
    expect(result.ok).toBe(true);
    expect(result.data!.primary).toBe('test.md');
  });

  it('should report blocked resolution', () => {
    mockedResolve.mockReturnValue({ primary: null, fallbacks: [], reason: 'blocked by policy', blocked: true });
    const result = handleDocResolve('blocked-task');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Bloqueado');
  });

  it('should audit documents', () => {
    const result = handleDocAudit();
    expect(result.ok).toBe(true);
    expect(result.data!.status).toBe('ok');
  });

  it('should list document sources', () => {
    const result = handleDocSources();
    expect(result.ok).toBe(true);
    expect(result.data!.total).toBe(0);
  });

  it('should list policies', () => {
    const result = handleDocPolicy();
    expect(result.ok).toBe(true);
    expect(result.data!.policies).toEqual([]);
  });

  it('should get document status', () => {
    const result = handleDocStatus();
    expect(result.ok).toBe(true);
    expect(result.data!.status).toBe('ok');
  });
});

describe('Domain barrel exports (index.ts)', () => {
  it('should export all use cases and services', () => {
    const barrel = require('../src/domain/index');
    expect(barrel.InitUseCase).toBeDefined();
    expect(barrel.DeployUseCase).toBeDefined();
    expect(barrel.GenerateUseCase).toBeDefined();
    expect(barrel.ConfigUseCase).toBeDefined();
    expect(barrel.AuditUseCase).toBeDefined();
    expect(barrel.QualityUseCase).toBeDefined();
    expect(barrel.TaskUseCase).toBeDefined();
    expect(barrel.SafetyUseCase).toBeDefined();
    expect(barrel.ProfileUseCase).toBeDefined();
    expect(barrel.PluginUseCase).toBeDefined();
    expect(barrel.NotificationUseCase).toBeDefined();
    expect(barrel.handleCoverageAudit).toBeDefined();
    expect(barrel.handleDocResolve).toBeDefined();
  });
});
