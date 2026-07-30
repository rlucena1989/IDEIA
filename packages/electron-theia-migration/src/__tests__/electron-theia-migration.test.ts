import { MigrationAnalyzer } from '../migration-analyzer';
import { MigrationCodemod } from '../migration-codemod';
import { FeatureParityMatrix } from '../feature-parity-matrix';
import { CompatibilityChecker } from '../compatibility-checker';
import { DiConverter } from '../di-converter';

describe('MigrationAnalyzer', () => {
  it('should register and report Electron API usages', () => {
    const analyzer = new MigrationAnalyzer();
    analyzer.registerUsage('ipcMain.handle', 'src/main.ts', 42);
    analyzer.registerUsage('BrowserWindow', 'src/main.ts', 55);
    analyzer.registerUsage('dialog.showOpenDialog', 'src/ui.ts', 10);
    const report = analyzer.generateReport();
    expect(report.totalUsages).toBe(3);
    expect(report.byCategory.ipc).toBe(1);
    expect(report.byCategory['browser-window']).toBe(1);
    expect(report.estimatedEffort).toBeGreaterThan(0);
  });

  it('should mark migration status', () => {
    const analyzer = new MigrationAnalyzer();
    analyzer.registerUsage('ipcMain.handle', 'src/main.ts', 1);
    analyzer.markStatus('ipcMain.handle', 'complete');
    const report = analyzer.generateReport();
    expect(report.byStatus.complete).toBe(1);
  });

  it('should detect blocking issues', () => {
    const analyzer = new MigrationAnalyzer();
    analyzer.registerUsage('Tray', 'src/tray.ts', 1);
    const report = analyzer.generateReport();
    expect(report.blockingIssues.length).toBeGreaterThan(0);
  });
});

describe('MigrationCodemod', () => {
  it('should register and list rules', () => {
    const codemod = new MigrationCodemod();
    const rules = codemod.getRules();
    expect(rules.length).toBeGreaterThanOrEqual(6);
  });

  it('should analyze file for pattern matches', () => {
    const codemod = new MigrationCodemod();
    const content = `ipcMain.handle('file:open', async () => {})`;
    const results = codemod.analyzeFile(content);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].matched).toBe(true);
  });

  it('should transform content', () => {
    const codemod = new MigrationCodemod();
    const content = `ipcMain.handle('file:open', handler)`;
    const { result, applied } = codemod.transformContent(content);
    expect(applied.length).toBeGreaterThan(0);
    expect(result).toContain('registry.registerCommand');
  });

  it('should categorize rules', () => {
    const codemod = new MigrationCodemod();
    const ipcRules = codemod.getRulesByCategory('ipc');
    expect(ipcRules.length).toBeGreaterThanOrEqual(2);
  });
});

describe('FeatureParityMatrix', () => {
  it('should have default features registered', () => {
    const matrix = new FeatureParityMatrix();
    const all = matrix.getAll();
    expect(all.length).toBeGreaterThan(10);
    expect(all.some(f => f.feature === 'Window Management')).toBe(true);
  });

  it('should summarize parity status', () => {
    const matrix = new FeatureParityMatrix();
    const summary = matrix.getSummary();
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.completion).toBeGreaterThanOrEqual(0);
  });

  it('should filter by status', () => {
    const matrix = new FeatureParityMatrix();
    const critical = matrix.getByPriority('critical');
    expect(critical.length).toBeGreaterThan(0);
  });

  it('should update feature status', () => {
    const matrix = new FeatureParityMatrix();
    matrix.updateStatus('System Tray', 'partial');
    const partial = matrix.getByStatus('partial');
    expect(partial.some(f => f.feature === 'System Tray')).toBe(true);
  });
});

describe('CompatibilityChecker', () => {
  it('should check known APIs', () => {
    const checker = new CompatibilityChecker();
    const report = checker.check('app.getPath');
    expect(report.status).toBe('compatible');
    expect(report.theiaAlternative).toBeTruthy();
  });

  it('should return unknown for undocumented APIs', () => {
    const checker = new CompatibilityChecker();
    const report = checker.check('unknown.api');
    expect(report.status).toBe('unknown');
  });

  it('should batch check multiple APIs', () => {
    const checker = new CompatibilityChecker();
    const reports = checker.checkBatch(['app.getPath', 'Tray', 'Menu']);
    expect(reports.length).toBe(3);
    expect(reports[0].status).toBe('compatible');
    expect(reports[1].status).toBe('incompatible');
  });

  it('should generate summary', () => {
    const checker = new CompatibilityChecker();
    const reports = checker.checkBatch(['app.getPath', 'Tray', 'BrowserWindow']);
    const summary = checker.getSummary(reports);
    expect(summary.total).toBe(3);
  });
});

describe('DiConverter', () => {
  it('should analyze a class for DI patterns', () => {
    const converter = new DiConverter();
    const content = `
      export class AgentService {
        constructor(private nats: NatsClient) {}
        async process() {}
      }
    `;
    const result = converter.analyzeClass(content, 'AgentService');
    expect(result.dependencies.length).toBeGreaterThanOrEqual(1);
    expect(result.dependencies).toContain('NatsClient');
  });

  it('should generate module registration', () => {
    const converter = new DiConverter();
    const result = converter.generateModuleRegistration('AgentService', ['NatsClient']);
    expect(result).toContain('ContainerModule');
    expect(result).toContain('AgentService');
    expect(result).toContain('NatsClient');
  });
});
