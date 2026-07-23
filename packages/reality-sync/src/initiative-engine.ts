import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';

export interface FixAction {
  id: string;
  type: 'file:create' | 'file:write' | 'file:delete' | 'shell:exec' | 'config:update';
  target: string;
  description: string;
  payload: string | Record<string, unknown>;
  risk: 'low' | 'medium' | 'high';
}

export interface FixPlan {
  id: string;
  actions: FixAction[];
  description: string;
  createdAt: number;
}

export interface ScanResult {
  total: number;
  fixable: number;
  unfixable: number;
  autoFixable: FixIssue[];
  requiresHuman: FixIssue[];
}

export interface FixIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  category: string;
  autoFixable: boolean;
  autoFix?: FixAction[];
}

export type InitiativeLevel = 'passive' | 'assisted' | 'autonomous';

const _INITIATIVE_LEVELS: Record<InitiativeLevel, number> = {
  passive: 0,      // sÃ³ escaneia e reporta, nunca executa correÃ§Ãµes
  assisted: 1,     // escaneia, reporta, emite eventos com sugestÃµes (humano decide)
  autonomous: 2,   // escaneia, corrige, verifica automaticamente
};

export interface InitiativeConfig {
  level: InitiativeLevel;
  riskThreshold: 'low' | 'medium' | 'high';
  autoFixCategories: string[];
}

export interface InitiativeReport {
  timestamp: number;
  scanned: number;
  fixed: number;
  failed: number;
  skipped: number;
  details: { id: string; status: 'fixed' | 'failed' | 'skipped' | 'pending'; message: string }[];
}

function loadConfig(root: string): InitiativeConfig {
  const configPath = path.join(root, '.ai', 'reality-sync.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return { level: 'assisted', riskThreshold: 'medium', autoFixCategories: ['package', 'legal', 'security', 'governance', 'quality'] };
}

function saveConfig(root: string, config: InitiativeConfig): void {
  const configDir = path.join(root, '.ai');
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'reality-sync.json'), JSON.stringify(config, null, 2), 'utf-8');
}

export class ProactiveInitiativeEngine extends EventEmitter {
  private workspaceRoot: string;
  private packagesDir: string;
  private docsDir: string;
  private verbose: boolean;
  public config: InitiativeConfig;

  constructor(root: string, verbose = false) {
    super();
    this.workspaceRoot = root;
    this.packagesDir = path.join(root, 'packages');
    this.docsDir = path.join(root, 'docs');
    this.verbose = verbose;
    this.config = loadConfig(root);
  }

  getLevel(): InitiativeLevel { return this.config.level; }

  setLevel(level: InitiativeLevel): void {
    this.config.level = level;
    saveConfig(this.workspaceRoot, this.config);
    this.notify('info', `Initiative level set to: ${level}`);
  }

  setAutoFixCategories(categories: string[]): void {
    this.config.autoFixCategories = categories;
    saveConfig(this.workspaceRoot, this.config);
    this.notify('info', `Auto-fix categories set to: ${categories.join(', ')}`);
  }

  setRiskThreshold(threshold: 'low' | 'medium' | 'high'): void {
    this.config.riskThreshold = threshold;
    saveConfig(this.workspaceRoot, this.config);
    this.notify('info', `Risk threshold set to: ${threshold}`);
  }

  private canAutoFix(issue: FixIssue): boolean {
    if (this.config.level === 'passive') return false;
    if (!issue.autoFixable) return false;
    if (!issue.autoFix) return false;

    // Check risk threshold
    const riskLevels = { low: 0, medium: 1, high: 2 };
    const maxRisk = riskLevels[this.config.riskThreshold];
    for (const action of issue.autoFix) {
      if (riskLevels[action.risk] > maxRisk) {
        this.log(`Skipping ${issue.id}: risk ${action.risk} > threshold ${this.config.riskThreshold}`);
        return false;
      }
    }

    // Check category whitelist
    if (!this.config.autoFixCategories.includes(issue.category)) {
      this.log(`Skipping ${issue.id}: category ${issue.category} not in whitelist`);
      return false;
    }

    return this.config.level === 'autonomous';
  }

  private log(msg: string): void {
    if (this.verbose) console.log(`[Initiative] ${msg}`);
  }

  private notify(level: 'info' | 'warn' | 'error' | 'success', msg: string): void {
    const prefix = level === 'error' ? 'âŒ' : level === 'warn' ? 'âš ï¸' : level === 'success' ? 'âœ…' : 'â„¹ï¸';
    console.log(`${prefix} [Initiative] ${msg}`);
    this.emit('initiative:notification', { level, message: msg, timestamp: Date.now() });
  }

  // ===== SCANNERS =====

  scanAll(): ScanResult {
    const issues: FixIssue[] = [
      ...this.scanMissingVersions(),
      ...this.scanMissingLicense(),
      ...this.scanMissingSecurityMd(),
      ...this.scanMissingCodeOfConduct(),
      ...this.scanMissingEditorconfig(),
      ...this.scanMissingPrettierrc(),
      ...this.scanMissingNvmrc(),
      ...this.scanMissingCodeowners(),
      ...this.scanMissingFunding(),
      ...this.scanMissingSupport(),
      ...this.scanMissingGitattributes(),
      ...this.scanEnvTracked(),
      ...this.scanContributingPlaceholders(),
      ...this.scanMissingTestDirs(),
      ...this.scanStaleManifest(),
    ];

    const autoFixable = issues.filter(i => i.autoFixable);
    const requiresHuman = issues.filter(i => !i.autoFixable);

    this.log(`Scan complete: ${issues.length} issues (${autoFixable.length} auto-fixable, ${requiresHuman.length} require human)`);

    return { total: issues.length, fixable: autoFixable.length, unfixable: requiresHuman.length, autoFixable, requiresHuman };
  }

  private scanMissingVersions(): FixIssue[] {
    const results: FixIssue[] = [];
    try {
      const dirs = fs.readdirSync(this.packagesDir).filter(d => fs.statSync(path.join(this.packagesDir, d)).isDirectory());
      for (const dir of dirs) {
        const pkgPath = path.join(this.packagesDir, dir, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          if (!pkg.version) {
            results.push({
              id: `version:${dir}`,
              severity: 'high',
              description: `Package ${dir} sem version`,
              category: 'package',
              autoFixable: true,
              autoFix: [{
                id: `fix:version:${dir}`,
                type: 'config:update',
                target: pkgPath,
                description: `Adicionar version 1.0.0-alpha.0 a ${dir}`,
                payload: { op: 'set', key: 'version', value: '1.0.0-alpha.0' },
                risk: 'low',
              }],
            });
          }
        } catch {}
      }
    } catch {}
    return results;
  }

  private scanMissingLicense(): FixIssue[] {
    const licensePath = path.join(this.workspaceRoot, 'LICENSE');
    if (!fs.existsSync(licensePath)) {
      return [{
        id: 'license:missing',
        severity: 'critical',
        description: 'LICENSE nÃ£o existe',
        category: 'legal',
        autoFixable: true,
        autoFix: [{
          id: 'fix:license',
          type: 'file:create',
          target: licensePath,
          description: 'Criar LICENSE MIT',
          payload: `MIT License\n\nCopyright (c) 2026 AI-Devkit\n\nPermission is hereby granted...`,
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingSecurityMd(): FixIssue[] {
    const p = path.join(this.workspaceRoot, '..', 'SECURITY.md');
    if (!fs.existsSync(p)) {
      return [{
        id: 'security:missing',
        severity: 'critical',
        description: 'SECURITY.md nÃ£o existe',
        category: 'security',
        autoFixable: true,
        autoFix: [{
          id: 'fix:security',
          type: 'file:create', target: p,
          description: 'Criar SECURITY.md',
          payload: `# Security Policy\n\n## Reporting a Vulnerability\n\nPlease report security issues to security@ai-devkit.dev`,
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingCodeOfConduct(): FixIssue[] {
    const p = path.join(this.workspaceRoot, '..', 'CODE_OF_CONDUCT.md');
    if (!fs.existsSync(p)) {
      return [{
        id: 'conduct:missing',
        severity: 'critical',
        description: 'CODE_OF_CONDUCT.md nÃ£o existe',
        category: 'governance',
        autoFixable: true,
        autoFix: [{
          id: 'fix:conduct',
          type: 'file:create', target: p,
          description: 'Criar CODE_OF_CONDUCT.md',
          payload: `# Contributor Covenant Code of Conduct\n\n## Our Pledge\n\nWe pledge to make participation...`,
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingEditorconfig(): FixIssue[] {
    const p = path.join(this.workspaceRoot, '.editorconfig');
    if (!fs.existsSync(p)) {
      return [{
        id: 'editorconfig:missing', severity: 'medium', description: '.editorconfig nÃ£o existe',
        category: 'quality', autoFixable: true,
        autoFix: [{
          id: 'fix:editorconfig', type: 'file:create', target: p,
          description: 'Criar .editorconfig',
          payload: 'root = true\n\n[*]\nend_of_line = lf\ninsert_final_newline = true\ncharset = utf-8\nindent_style = space\nindent_size = 2',
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingPrettierrc(): FixIssue[] {
    const p = path.join(this.workspaceRoot, '.prettierrc');
    if (!fs.existsSync(p)) {
      return [{
        id: 'prettierrc:missing', severity: 'medium', description: '.prettierrc nÃ£o existe',
        category: 'quality', autoFixable: true,
        autoFix: [{
          id: 'fix:prettierrc', type: 'file:create', target: p,
          description: 'Criar .prettierrc',
          payload: JSON.stringify({ semi: true, singleQuote: true, tabWidth: 2, trailingComma: 'all', printWidth: 120 }, null, 2),
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingNvmrc(): FixIssue[] {
    const nvmrc = path.join(this.workspaceRoot, '.nvmrc');
    const nodeVersion = path.join(this.workspaceRoot, '.node-version');
    if (!fs.existsSync(nvmrc) && !fs.existsSync(nodeVersion)) {
      return [{
        id: 'nvmrc:missing', severity: 'medium', description: '.nvmrc ou .node-version nÃ£o existe',
        category: 'quality', autoFixable: true,
        autoFix: [{
          id: 'fix:nvmrc', type: 'file:create', target: nvmrc,
          description: 'Criar .nvmrc',
          payload: '20', risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingCodeowners(): FixIssue[] {
    const p = path.join(this.workspaceRoot, 'CODEOWNERS');
    if (!fs.existsSync(p)) {
      return [{
        id: 'codeowners:missing', severity: 'medium', description: 'CODEOWNERS nÃ£o existe',
        category: 'governance', autoFixable: true,
        autoFix: [{
          id: 'fix:codeowners', type: 'file:create', target: p,
          description: 'Criar CODEOWNERS',
          payload: '* @ideia/core',
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingFunding(): FixIssue[] {
    const dir = path.join(this.workspaceRoot, '.github');
    const p = path.join(dir, 'FUNDING.yml');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(p)) {
      return [{
        id: 'funding:missing', severity: 'medium', description: 'FUNDING.yml nÃ£o existe',
        category: 'governance', autoFixable: true,
        autoFix: [{
          id: 'fix:funding', type: 'file:create', target: p,
          description: 'Criar FUNDING.yml',
          payload: 'github: [ai-devkit]',
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingSupport(): FixIssue[] {
    const p = path.join(this.workspaceRoot, 'SUPPORT.md');
    if (!fs.existsSync(p)) {
      return [{
        id: 'support:missing', severity: 'medium', description: 'SUPPORT.md nÃ£o existe',
        category: 'governance', autoFixable: true,
        autoFix: [{
          id: 'fix:support', type: 'file:create', target: p,
          description: 'Criar SUPPORT.md',
          payload: `# Support\n\nFor support, please open an issue on GitHub.`,
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanMissingGitattributes(): FixIssue[] {
    const p = path.join(this.workspaceRoot, '.gitattributes');
    if (!fs.existsSync(p)) {
      return [{
        id: 'gitattributes:missing', severity: 'medium', description: '.gitattributes nÃ£o existe',
        category: 'quality', autoFixable: true,
        autoFix: [{
          id: 'fix:gitattributes', type: 'file:create', target: p,
          description: 'Criar .gitattributes',
          payload: '* text=auto eol=lf\n*.ts text\ntsconfig.json text\npackage.json text\n',
          risk: 'low',
        }],
      }];
    }
    return [];
  }

  private scanEnvTracked(): FixIssue[] {
    try {
      const git = execFileSync('git ls-files .env', { cwd: this.workspaceRoot, encoding: 'utf-8', stdio: 'pipe' }).trim();
      if (git) {
        return [{
          id: 'env:tracked', severity: 'high', description: '.env estÃ¡ versionado no git',
          category: 'security', autoFixable: true,
          autoFix: [{
            id: 'fix:env:untrack', type: 'shell:exec', target: '.env',
            description: 'Remover .env do tracking git',
            payload: 'git rm --cached .env', risk: 'medium',
          }, {
            id: 'fix:env:gitignore', type: 'shell:exec', target: '.gitignore',
            description: 'Adicionar .env ao .gitignore',
            payload: `echo "\n.env" >> .gitignore`, risk: 'low',
          }],
        }];
      }
    } catch {}
    return [];
  }

  private scanContributingPlaceholders(): FixIssue[] {
    const p = path.join(this.workspaceRoot, '..', 'CONTRIBUTING.md');
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      if (content.includes('{{')) {
        return [{
          id: 'contributing:placeholders', severity: 'medium', description: 'CONTRIBUTING.md contÃ©m placeholders',
          category: 'governance', autoFixable: true,
          autoFix: [{
            id: 'fix:contributing', type: 'file:write', target: p,
            description: 'Substituir placeholders em CONTRIBUTING.md',
            payload: content
              .replace(/\{\{projectName\}\}/g, 'AI-Devkit')
              .replace(/\{\{project_name\}\}/g, 'ai-devkit')
              .replace(/\{\{packageManager\}\}/g, 'npm')
              .replace(/\{\{Name\}\}/g, 'AI-Devkit'),
            risk: 'low',
          }],
        }];
      }
    }
    return [];
  }

  private scanMissingTestDirs(): FixIssue[] {
    const results: FixIssue[] = [];
    try {
      const dirs = fs.readdirSync(this.packagesDir).filter(d => fs.statSync(path.join(this.packagesDir, d)).isDirectory());
      for (const dir of dirs) {
        const pkgDir = path.join(this.packagesDir, dir);
        const testDir = path.join(pkgDir, '__tests__');
        const srcTestDir = path.join(pkgDir, 'src', '__tests__');
        const hasTests = fs.existsSync(testDir) || fs.existsSync(srcTestDir);
        if (!hasTests) {
          results.push({
            id: `tests:missing:${dir}`,
            severity: 'medium',
            description: `Package ${dir} sem diretÃ³rio de testes`,
            category: 'testing',
            autoFixable: false,
          });
        }
      }
    } catch {}
    return results;
  }

  private scanStaleManifest(): FixIssue[] {
    const manifestPath = path.join(this.docsDir, 'governance', 'REALITY-MANIFEST.md');
    if (fs.existsSync(manifestPath)) {
      const age = Date.now() - fs.statSync(manifestPath).mtimeMs;
      if (age > 7 * 24 * 60 * 60 * 1000) {
        return [{
          id: 'manifest:stale', severity: 'medium', description: `REALITY-MANIFEST.md desatualizado (${Math.round(age / 86400000)}d)`,
          category: 'documentation', autoFixable: false,
        }];
      }
    }
    return [];
  }

  // ===== STUDY SCANNER =====

  scanStudies(): { name: string; lines: number; hasTasks: boolean; hasAdr: boolean; hasRisks: boolean; hasMetrics: boolean; hasTimeline: boolean; hasTests: boolean; score: number }[] {
    const results: { name: string; lines: number; hasTasks: boolean; hasAdr: boolean; hasRisks: boolean; hasMetrics: boolean; hasTimeline: boolean; hasTests: boolean; score: number }[] = [];
    const parentDocs = path.resolve(this.workspaceRoot, '..', 'docs', 'ESTUDOS');
    const possiveis = [
      parentDocs,
      path.join(this.docsDir, 'ESTUDOS'),
      path.join(this.workspaceRoot, 'docs', 'ESTUDOS'),
      path.join(this.workspaceRoot, '..', 'docs', 'governance'),
    ];
    let estudosDir = '';
    for (const p of possiveis) {
      if (fs.existsSync(p)) { estudosDir = p; break; }
    }
    if (!estudosDir) return results;

    for (const file of fs.readdirSync(estudosDir)) {
      if (!file.endsWith('.md')) continue;
      const filePath = path.join(estudosDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;

      const hasTasks = /TASK-IDEIA|\bTasks?\s*Geradas?\b|\bTarefas?\b/i.test(content);
      const hasAdr = /ADR-\d{3}|\bADR\b/i.test(content);
      const hasRisks = /\b(?:riscos?|risk|perigo|vulnerab|threat|periculos)\b/i.test(content);
      const hasMetrics = /\b(?:métric[as]|metric|indicador|kpi|sla|slo|benchmark|desempenho)\b/i.test(content);
      const hasTimeline = /\b(?:timeline|cronograma|prazo|fase\s|phase\s|sprint|etapa|roadmap)\b/i.test(content);
      const hasTests = /\b(?:testes?|test|jest|playwright|verify|validação|validacao)\b/i.test(content);

      let score = 1;
      if (hasRisks) score++;
      if (hasMetrics) score++;
      if (hasTimeline) score++;
      if (hasTasks) score++;
      if (hasAdr) score++;

      results.push({
        name: file.replace('.md', ''),
        lines,
        hasTasks, hasAdr, hasRisks, hasMetrics, hasTimeline, hasTests,
        score: hasTests ? Math.min(score + 1, 5) : Math.min(score, 5),
      });
    }

    results.sort((a, b) => a.score - b.score);
    return results;
  }

  // ===== FIX EXECUTOR =====

  private applyFix(action: FixAction): boolean {
    try {
      switch (action.type) {
        case 'file:create': {
          const dir = path.dirname(action.target);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(action.target, action.payload as string, 'utf-8');
          this.log(`Created ${action.target}`);
          return true;
        }
        case 'file:write': {
          fs.writeFileSync(action.target, action.payload as string, 'utf-8');
          this.log(`Wrote ${action.target}`);
          return true;
        }
        case 'file:delete': {
          if (fs.existsSync(action.target)) fs.unlinkSync(action.target);
          this.log(`Deleted ${action.target}`);
          return true;
        }
        case 'shell:exec': {
          execFileSync(action.payload as string, { cwd: this.workspaceRoot, stdio: 'pipe' });
          this.log(`Executed: ${(action.payload as string).substring(0, 80)}`);
          return true;
        }
        case 'config:update': {
          const payload = action.payload as { op: string; key: string; value: unknown };
          if (payload.op === 'set') {
            const content = JSON.parse(fs.readFileSync(action.target, 'utf-8'));
            content[payload.key] = payload.value;
            fs.writeFileSync(action.target, JSON.stringify(content, null, 2) + '\n', 'utf-8');
            this.log(`Updated ${action.target}: ${payload.key}=${payload.value}`);
            return true;
          }
          return false;
        }
        default:
          return false;
      }
    } catch (_err) {
      this.log(`Fix failed for ${action.id}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  // ===== RUN ALL =====

  runAll(): InitiativeReport {
    this.notify('info', 'Running all scanners and applying fixes (runAll mode)');
    const autonomousLevel = this.config.level;
    if (this.config.level !== 'autonomous') {
      this.setLevel('autonomous');
    }
    const result = this.runCycle();
    if (autonomousLevel !== 'autonomous') {
      this.setLevel(autonomousLevel);
    }
    return result;
  }

  getScannerStatus(): { name: string; status: 'active' | 'inactive'; lastRun?: number; issuesFound: number }[] {
    const scanners = [
      { name: 'scanMissingVersions', fn: () => this.scanMissingVersions() },
      { name: 'scanMissingLicense', fn: () => this.scanMissingLicense() },
      { name: 'scanMissingSecurityMd', fn: () => this.scanMissingSecurityMd() },
      { name: 'scanMissingCodeOfConduct', fn: () => this.scanMissingCodeOfConduct() },
      { name: 'scanMissingEditorconfig', fn: () => this.scanMissingEditorconfig() },
      { name: 'scanMissingPrettierrc', fn: () => this.scanMissingPrettierrc() },
      { name: 'scanMissingNvmrc', fn: () => this.scanMissingNvmrc() },
      { name: 'scanMissingCodeowners', fn: () => this.scanMissingCodeowners() },
      { name: 'scanMissingFunding', fn: () => this.scanMissingFunding() },
      { name: 'scanMissingSupport', fn: () => this.scanMissingSupport() },
      { name: 'scanMissingGitattributes', fn: () => this.scanMissingGitattributes() },
      { name: 'scanEnvTracked', fn: () => this.scanEnvTracked() },
      { name: 'scanContributingPlaceholders', fn: () => this.scanContributingPlaceholders() },
      { name: 'scanMissingTestDirs', fn: () => this.scanMissingTestDirs() },
      { name: 'scanStaleManifest', fn: () => this.scanStaleManifest() },
    ];

    return scanners.map(s => {
      try {
        const issues = s.fn();
        return { name: s.name, status: 'active' as const, issuesFound: issues.length };
      } catch {
        return { name: s.name, status: 'inactive' as const, issuesFound: 0 };
      }
    });
  }

  // ===== MAIN LOOP =====

  executePlan(plan: FixPlan): InitiativeReport {
    const details: InitiativeReport['details'] = [];
    this.notify('info', `Executing plan: ${plan.description} (${plan.actions.length} actions)`);

    for (const action of plan.actions) {
      try {
        const ok = this.applyFix(action);
        details.push({
          id: action.id,
          status: ok ? 'fixed' : 'failed',
          message: ok ? `Applied: ${action.description}` : `Failed: ${action.description}`,
        });
      } catch (_err) {
        details.push({
          id: action.id,
          status: 'failed',
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const fixed = details.filter(d => d.status === 'fixed').length;
    const failed = details.filter(d => d.status === 'failed').length;

    this.notify(failed > 0 ? 'warn' : 'success', `Plan complete: ${fixed} fixed, ${failed} failed`);

    return {
      timestamp: Date.now(),
      scanned: plan.actions.length,
      fixed,
      failed,
      skipped: details.filter(d => d.status === 'skipped').length,
      details,
    };
  }

  /**
   * Full proactive cycle: scan â†’ plan â†’ fix â†’ verify â†’ report
   * Respects the configured InitiativeLevel:
   *   passive:     scan only, no fixes
   *   assisted:    scan + emit suggestions, no auto-fixes
   *   autonomous:  scan + fix + verify
   */
  runCycle(): InitiativeReport {
    this.notify('info', `Starting proactive initiative cycle (level: ${this.config.level})`);

    const scan = this.scanAll();

    if (this.config.level === 'passive') {
      this.notify('info', `[passive] Scan complete: ${scan.total} issues (${scan.fixable} auto-fixable, ${scan.unfixable} human-only)`);
      if (scan.fixable > 0) {
        for (const issue of scan.autoFixable) {
          this.log(`  â†’ Would fix: ${issue.description}`);
        }
      }
      this.emit('initiative:scan', { scan, timestamp: Date.now(), level: 'passive' });
      return { timestamp: Date.now(), scanned: scan.total, fixed: 0, failed: 0, skipped: scan.total, details: scan.autoFixable.map(i => ({ id: i.id, status: 'skipped', message: `[passive] ${i.description}` })) };
    }

    if (this.config.level === 'assisted') {
      this.notify('warn', `[assisted] ${scan.fixable} auto-fixable issue(s) found â€” run 'ai-devkit reality-sync heal --approve' to apply`);
      for (const issue of scan.autoFixable) {
        this.log(`  â†’ Suggestion: ${issue.description} (${issue.autoFix?.length || 0} actions)`);
      }
      this.emit('initiative:suggestions', { scan, timestamp: Date.now() });
      return { timestamp: Date.now(), scanned: scan.total, fixed: 0, failed: 0, skipped: scan.total, details: scan.autoFixable.map(i => ({ id: i.id, status: 'pending', message: `[assisted] awaiting approval: ${i.description}` })) };
    }

    // autonomous level
    const fixableIssues = scan.autoFixable.filter(i => this.canAutoFix(i));
    const skippedIssues = scan.autoFixable.filter(i => !this.canAutoFix(i));

    if (fixableIssues.length === 0) {
      this.notify('info', `No eligible auto-fixable issues (${skippedIssues.length} filtered by policy)`);
      return { timestamp: Date.now(), scanned: scan.total, fixed: 0, failed: 0, skipped: scan.total, details: [] };
    }

    const actions: FixAction[] = [];
    for (const issue of fixableIssues) {
      if (issue.autoFix) actions.push(...issue.autoFix);
    }

    const plan: FixPlan = {
      id: `initiative_${Date.now()}`,
      actions,
      description: `Auto-fix ${fixableIssues.length} issues (${skippedIssues.length} filtered, ${scan.unfixable} require human)`,
      createdAt: Date.now(),
    };

    this.notify('info', `Plan generated: ${plan.actions.length} fix actions for ${fixableIssues.length} issues`);

    const result = this.executePlan(plan);

    if (result.failed === 0) {
      this.notify('success', `All ${result.fixed} fixes applied successfully`);
    } else if (result.fixed > 0) {
      this.notify('warn', `${result.fixed} fixed, ${result.failed} failed`);
    } else {
      this.notify('error', `All ${result.failed} fixes failed`);
    }

    this.log('Running verification scan...');
    const verifyScan = this.scanAll();
    const remaining = verifyScan.autoFixable.filter(i => this.canAutoFix(i));
    if (remaining.length === 0) {
      this.notify('success', 'Verification: all eligible issues resolved');
    } else {
      this.notify('warn', `Verification: ${remaining.length} issues still fixable`);
    }

    this.emit('initiative:cycle', { scan, plan, result, verifyScan, timestamp: Date.now() });
    return result;
  }
}
