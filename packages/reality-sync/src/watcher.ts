import * as chokidar from 'chokidar';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import { SyncConfig, SyncEvent, SyncResult } from './types';
import { syncManifest } from './sync-manifest';
import { syncGaps } from './sync-gaps';
import { syncRegistry } from './sync-registry';
import { ProactiveInitiativeEngine } from './initiative-engine';
import { StudyIntensifier } from './study-intensifier';
import { StudyScanner } from './study-scanner';
import { TechRadarAPI } from './tech-radar';
import { AutoStudyGenerator } from './auto-study';

export interface RealitySyncOptions {
  config: SyncConfig;
  debounceMs?: number;
  verbose?: boolean;
  initiativeIntervalMs?: number;
}

const DEFAULT_OPTIONS: Partial<RealitySyncOptions> = {
  debounceMs: 2000,
  verbose: false,
};

export class RealitySyncDaemon extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private running = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private initiativeTimer: ReturnType<typeof setInterval> | null = null;
  private pendingSync = new Set<string>();
  private options: RealitySyncOptions;
  private knownPackages: Set<string> = new Set();
  private driftCount = 0;
  private initiative: ProactiveInitiativeEngine;
  private studyIntensifier: StudyIntensifier;
  private studyScanner: StudyScanner;
  private techRadar: TechRadarAPI;
  private autoStudyGenerator: AutoStudyGenerator;

  constructor(opts: RealitySyncOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...opts } as RealitySyncOptions;
    this.initiative = new ProactiveInitiativeEngine(this.options.config.workspaceRoot, this.options.verbose);
    this.studyIntensifier = new StudyIntensifier(this.options.config.workspaceRoot, this.options.verbose);
    this.studyScanner = new StudyScanner(this.options.config.workspaceRoot, this.options.verbose);
    this.techRadar = new TechRadarAPI();
    this.autoStudyGenerator = new AutoStudyGenerator(this.options.config.workspaceRoot);

    this.initiative.on('initiative:notification', ({ level, message }) => {
      if (level === 'error') this.notify('error', `[Initiative] ${message}`);
      else if (level === 'warn') this.notify('warn', `[Initiative] ${message}`);
      else this.log(`[Initiative] ${message}`);
    });

    this.studyScanner.on('monitoring:degraded', ({ entries }) => {
      for (const entry of entries) {
        this.notify('warn', `Study degraded: ${entry.name} (${entry.score}/5)`);
      }
    });

    this.studyScanner.on('monitoring:critical', ({ averageScore }) => {
      this.notify('error', `Critical: Average study score ${averageScore.toFixed(1)} below threshold`);
    });

    this.studyIntensifier.on('intensify:auto', ({ report }) => {
      if (report.fixesApplied > 0) {
        this.notify('info', `Auto-intensified ${report.fixesApplied} studies`);
      }
    });
  }

  private log(msg: string): void {
    if (this.options.verbose) console.log(`[RealitySync] ${msg}`);
  }

  private notify(level: 'info' | 'warn' | 'error', msg: string): void {
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✓';
    console.log(`${prefix} [RealitySync] ${msg}`);
    this.emit('notification', { level, message: msg, timestamp: Date.now() });
  }

  private shouldIgnore(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    for (const pattern of this.options.config.ignorePatterns) {
      if (normalized.includes(pattern)) return true;
    }
    return false;
  }

  private scheduleSync(event: SyncEvent): void {
    this.pendingSync.add(event.type);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.runPendingSyncs();
    }, this.options.debounceMs);
  }

  private runPendingSyncs(): void {
    const results: SyncResult[] = [];
    this.log(`Running sync for types: [${Array.from(this.pendingSync).join(', ')}]`);

    if (this.pendingSync.has('package:changed') || this.pendingSync.has('package:added') || this.pendingSync.has('package:removed')) {
      results.push(syncManifest(this.options.config));
      results.push(syncRegistry(this.options.config));
    }

    if (this.pendingSync.has('gap:resolved') || this.pendingSync.has('doc:changed')) {
      results.push(syncGaps(this.options.config));
    }

    this.pendingSync.clear();

    const allOk = results.every(r => r.ok);
    const totalActions = results.reduce((a, r) => a + r.actions.length, 0);
    const totalErrors = results.reduce((a, r) => a + r.errors.length, 0);

    if (totalActions > 0) this.notify('info', `${totalActions} auto-sync(s) applied`);
    if (totalErrors > 0) this.notify('error', `${totalErrors} sync error(s): ${results.flatMap(r => r.errors).join('; ')}`);

    this.log(`Sync complete: ${totalActions} actions, ${totalErrors} errors`);
    this.emit('sync:complete', { ok: allOk, results, timestamp: Date.now() });
  }

  private scanForNewPackages(): void {
    try {
      const packagesDir = this.options.config.packagesDir;
      const dirs = fs.readdirSync(packagesDir);
      for (const dir of dirs) {
        const pkgJsonPath = path.join(packagesDir, dir, 'package.json');
        if (fs.statSync(path.join(packagesDir, dir)).isDirectory() && fs.existsSync(pkgJsonPath)) {
          if (!this.knownPackages.has(dir)) {
            this.knownPackages.add(dir);
            this.notify('info', `Auto-discovered package: ${dir}`);
            this.scheduleSync({ type: 'package:added', path: pkgJsonPath, timestamp: Date.now() });
          }
        }
      }
    } catch { /* skip */ }
  }

  private detectDrift(): void {
    try {
      const { manifestPath, gapsPath } = this.options.config;

      if (!fs.existsSync(manifestPath)) {
        this.driftCount++;
        this.notify('warn', `DRIFT: Manifest not found at ${manifestPath} — run 'ai-devkit reality-sync sync'`);
      }

      if (!fs.existsSync(gapsPath)) {
        this.driftCount++;
        this.notify('warn', `DRIFT: GAPS file not found at ${gapsPath} — run 'ai-devkit reality-sync sync'`);
      }

      const manifestAge = fs.statSync(manifestPath).mtimeMs;
      if (Date.now() - manifestAge > 24 * 60 * 60 * 1000) {
        this.driftCount++;
        this.notify('warn', `DRIFT: Manifest is >24h old — run 'ai-devkit reality-sync sync'`);
      }

    } catch { /* skip */ }
  }

  private handleChange(filePath: string): void {
    if (this.shouldIgnore(filePath)) return;
    const name = path.basename(filePath);

    if (name === 'package.json') {
      this.scheduleSync({ type: 'package:changed', path: filePath, timestamp: Date.now() });
      this.log(`Detected package change: ${filePath}`);
    }

    if (filePath.includes('__tests__') || filePath.endsWith('.test.ts') || filePath.endsWith('.test.js')) {
      this.scheduleSync({ type: 'test:changed', path: filePath, timestamp: Date.now() });
    }

    if (name === 'GAPS-PRODUCAO-IDE.md' || name === 'REALITY-MANIFEST.md' || name === 'document-registry.md') {
      this.scheduleSync({ type: 'doc:changed', path: filePath, timestamp: Date.now() });
    }
  }

  private handleAdd(filePath: string): void {
    if (this.shouldIgnore(filePath)) return;
    if (path.basename(filePath) === 'package.json' && filePath.includes('packages')) {
      this.scheduleSync({ type: 'package:added', path: filePath, timestamp: Date.now() });
      this.notify('info', `New package: ${filePath}`);
    }
  }

  private handleUnlink(filePath: string): void {
    if (filePath.includes('packages') && path.basename(filePath) === 'package.json') {
      this.scheduleSync({ type: 'package:removed', path: filePath, timestamp: Date.now() });
      this.notify('warn', `Package removed: ${filePath}`);
    }
  }

  recovery(): void {
    this.notify('info', 'Running recovery — re-syncing all docs from code...');
    const results = this.syncNow();
    const ok = results.every(r => r.ok);
    const actions = results.flatMap(r => r.actions);
    if (ok) {
      this.notify('info', `Recovery complete: ${actions.length} action(s) applied`);
      for (const a of actions) this.log(`  → ${a}`);
    } else {
      this.notify('error', 'Recovery failed — check errors above');
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    const { watchPaths } = this.options.config;

    this.log(`Starting RealitySync watcher on ${watchPaths.length} paths`);
    this.log(`Watching: ${watchPaths.join(', ')}`);

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      ignored: this.options.config.ignorePatterns,
    });

    this.watcher.on('change', (p) => this.handleChange(p));
    this.watcher.on('add', (p) => this.handleAdd(p));
    this.watcher.on('unlink', (p) => this.handleUnlink(p));

    this.scanForNewPackages();
    this.detectDrift();

    // Start proactive initiative cycle (periodic scan → fix → verify)
    const interval = this.options.initiativeIntervalMs || 30 * 60 * 1000;
    this.runInitiativeCycle();
    this.initiativeTimer = setInterval(() => this.runInitiativeCycle(), interval);
    this.log(`Proactive initiative cycle every ${Math.round(interval / 60000)}min`);

    this.emit('started', { timestamp: Date.now() });
    this.notify('info', `Daemon started (${watchPaths.length} paths, auto-heal every ${Math.round(interval / 60000)}min)`);

    if (this.driftCount > 0) {
      this.notify('warn', `${this.driftCount} drift(s) detected — auto-recovering...`);
      this.recovery();
    }

    this.runPendingSyncs();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.initiativeTimer) {
      clearInterval(this.initiativeTimer);
      this.initiativeTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.emit('stopped', { timestamp: Date.now() });
    this.notify('info', 'Daemon stopped');
  }

  isRunning(): boolean { return this.running; }
  getDriftCount(): number { return this.driftCount; }

  async runInitiativeCycle(): Promise<void> {
    this.log('Running proactive initiative cycle...');
    try {
      const result = this.initiative.runCycle();
      if (result.fixed > 0) {
        this.notify('info', `Auto-healed ${result.fixed} issue(s) — running re-sync...`);
        this.runPendingSyncs();
      }
    } catch (_err) {
      this.log(`Initiative cycle error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Auto-intensify studies
    try {
      const gaps = this.studyIntensifier.scanGaps();
      if (gaps.length > 0) {
        this.log(`Study intensification: ${gaps.length} studies have gaps`);
        const plan = this.studyIntensifier.generatePlan(gaps);
        if (plan.autoFixable.length > 0) {
          this.log(`Auto-fixing ${plan.autoFixable.length} studies...`);
          this.studyIntensifier.runCycle();
        }
        // Generate AI helper script
        const scriptsDir = path.join(this.options.config.workspaceRoot, '.ai', 'scripts');
        if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });
        this.studyIntensifier.generateAIScript(plan, path.join(scriptsDir, 'intensify-helper.js'));
      }
    } catch (_err) {
      this.log(`Study intensification error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // StudyScanner monitoring
    try {
      this.studyScanner.alertOnDegradation(3);
    } catch (_err) {
      this.log(`StudyScanner alert error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // TechRadar auto-scan
    try {
      const now = Date.now();
      const lastScanPath = path.join(this.options.config.workspaceRoot, '.ai', 'cache', 'tech-radar-last-scan');
      try {
        const lastScan = parseInt(fs.readFileSync(lastScanPath, 'utf-8'), 10);
        if (now - lastScan > 24 * 60 * 60 * 1000) {
          this.log('Running tech radar auto-scan...');
          const results = await this.techRadar.scanGithubTrending('typescript', 'weekly');
          this.log(`Tech radar: ${results.length} items found`);
          fs.writeFileSync(lastScanPath, String(now), 'utf-8');
        }
      } catch {
        fs.writeFileSync(lastScanPath, String(now), 'utf-8');
      }
    } catch (_err) {
      this.log(`TechRadar scan error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  scanForIssues(): import('./initiative-engine').ScanResult {
    return this.initiative.scanAll();
  }

  syncNow(): SyncResult[] {
    this.pendingSync.add('package:changed');
    this.pendingSync.add('gap:resolved');
    this.pendingSync.add('doc:changed');
    const results: SyncResult[] = [];
    results.push(syncManifest(this.options.config));
    results.push(syncGaps(this.options.config));
    results.push(syncRegistry(this.options.config));
    this.pendingSync.clear();
    return results;
  }
}

function _basename(p: string): string {
  return p.split(/[/\\]/).pop() || '';
}
