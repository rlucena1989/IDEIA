"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealitySyncDaemon = void 0;
const chokidar = __importStar(require("chokidar"));
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('reality-sync-watcher');
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_events_1 = require("node:events");
const sync_manifest_1 = require("./sync-manifest");
const sync_gaps_1 = require("./sync-gaps");
const sync_registry_1 = require("./sync-registry");
const initiative_engine_1 = require("./initiative-engine");
const study_intensifier_1 = require("./study-intensifier");
const study_scanner_1 = require("./study-scanner");
const tech_radar_1 = require("./tech-radar");
const auto_study_1 = require("./auto-study");
const DEFAULT_OPTIONS = {
    debounceMs: 2000,
    verbose: false,
};
class RealitySyncDaemon extends node_events_1.EventEmitter {
    watcher = null;
    running = false;
    debounceTimer = null;
    initiativeTimer = null;
    pendingSync = new Set();
    options;
    knownPackages = new Set();
    driftCount = 0;
    initiative;
    studyIntensifier;
    studyScanner;
    techRadar;
    autoStudyGenerator;
    constructor(opts) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...opts };
        this.initiative = new initiative_engine_1.ProactiveInitiativeEngine(this.options.config.workspaceRoot, this.options.verbose);
        this.studyIntensifier = new study_intensifier_1.StudyIntensifier(this.options.config.workspaceRoot, this.options.verbose);
        this.studyScanner = new study_scanner_1.StudyScanner(this.options.config.workspaceRoot, this.options.verbose);
        this.techRadar = new tech_radar_1.TechRadarAPI();
        this.autoStudyGenerator = new auto_study_1.AutoStudyGenerator(this.options.config.workspaceRoot);
        this.initiative.on('initiative:notification', ({ level, message }) => {
            if (level === 'error')
                this.notify('error', `[Initiative] ${message}`);
            else if (level === 'warn')
                this.notify('warn', `[Initiative] ${message}`);
            else
                this.log(`[Initiative] ${message}`);
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
    log(msg) {
        if (this.options.verbose)
            logger.info('[RealitySync] ${msg}');
    }
    notify(level, msg) {
        const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✓';
        logger.info('${prefix} [RealitySync] ${msg}');
        this.emit('notification', { level, message: msg, timestamp: Date.now() });
    }
    shouldIgnore(filePath) {
        const normalized = filePath.replace(/\\/g, '/');
        for (const pattern of this.options.config.ignorePatterns) {
            if (normalized.includes(pattern))
                return true;
        }
        return false;
    }
    scheduleSync(event) {
        this.pendingSync.add(event.type);
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.runPendingSyncs();
        }, this.options.debounceMs);
    }
    runPendingSyncs() {
        const results = [];
        this.log(`Running sync for types: [${Array.from(this.pendingSync).join(', ')}]`);
        if (this.pendingSync.has('package:changed') || this.pendingSync.has('package:added') || this.pendingSync.has('package:removed')) {
            results.push((0, sync_manifest_1.syncManifest)(this.options.config));
            results.push((0, sync_registry_1.syncRegistry)(this.options.config));
        }
        if (this.pendingSync.has('gap:resolved') || this.pendingSync.has('doc:changed')) {
            results.push((0, sync_gaps_1.syncGaps)(this.options.config));
        }
        this.pendingSync.clear();
        const allOk = results.every(r => r.ok);
        const totalActions = results.reduce((a, r) => a + r.actions.length, 0);
        const totalErrors = results.reduce((a, r) => a + r.errors.length, 0);
        if (totalActions > 0)
            this.notify('info', `${totalActions} auto-sync(s) applied`);
        if (totalErrors > 0)
            this.notify('error', `${totalErrors} sync error(s): ${results.flatMap(r => r.errors).join('; ')}`);
        this.log(`Sync complete: ${totalActions} actions, ${totalErrors} errors`);
        this.emit('sync:complete', { ok: allOk, results, timestamp: Date.now() });
    }
    scanForNewPackages() {
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
        }
        catch { /* skip */ }
    }
    detectDrift() {
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
        }
        catch { /* skip */ }
    }
    handleChange(filePath) {
        if (this.shouldIgnore(filePath))
            return;
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
    handleAdd(filePath) {
        if (this.shouldIgnore(filePath))
            return;
        if (path.basename(filePath) === 'package.json' && filePath.includes('packages')) {
            this.scheduleSync({ type: 'package:added', path: filePath, timestamp: Date.now() });
            this.notify('info', `New package: ${filePath}`);
        }
    }
    handleUnlink(filePath) {
        if (filePath.includes('packages') && path.basename(filePath) === 'package.json') {
            this.scheduleSync({ type: 'package:removed', path: filePath, timestamp: Date.now() });
            this.notify('warn', `Package removed: ${filePath}`);
        }
    }
    recovery() {
        this.notify('info', 'Running recovery — re-syncing all docs from code...');
        const results = this.syncNow();
        const ok = results.every(r => r.ok);
        const actions = results.flatMap(r => r.actions);
        if (ok) {
            this.notify('info', `Recovery complete: ${actions.length} action(s) applied`);
            for (const a of actions)
                this.log(`  → ${a}`);
        }
        else {
            this.notify('error', 'Recovery failed — check errors above');
        }
    }
    start() {
        if (this.running)
            return;
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
    stop() {
        if (!this.running)
            return;
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
    isRunning() { return this.running; }
    getDriftCount() { return this.driftCount; }
    async runInitiativeCycle() {
        this.log('Running proactive initiative cycle...');
        try {
            const result = this.initiative.runCycle();
            if (result.fixed > 0) {
                this.notify('info', `Auto-healed ${result.fixed} issue(s) — running re-sync...`);
                this.runPendingSyncs();
            }
        }
        catch (_err) {
            this.log(`Initiative cycle error: ${_err instanceof Error ? _err.message : String(_err)}`);
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
                if (!fs.existsSync(scriptsDir))
                    fs.mkdirSync(scriptsDir, { recursive: true });
                this.studyIntensifier.generateAIScript(plan, path.join(scriptsDir, 'intensify-helper.js'));
            }
        }
        catch (_err) {
            this.log(`Study intensification error: ${_err instanceof Error ? _err.message : String(_err)}`);
        }
        // StudyScanner monitoring
        try {
            this.studyScanner.alertOnDegradation(3);
        }
        catch (_err) {
            this.log(`StudyScanner alert error: ${_err instanceof Error ? _err.message : String(_err)}`);
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
            }
            catch {
                fs.writeFileSync(lastScanPath, String(now), 'utf-8');
            }
        }
        catch {
            this.log('TechRadar scan error (see previous logs)');
        }
    }
    scanForIssues() {
        return this.initiative.scanAll();
    }
    syncNow() {
        this.pendingSync.add('package:changed');
        this.pendingSync.add('gap:resolved');
        this.pendingSync.add('doc:changed');
        const results = [];
        results.push((0, sync_manifest_1.syncManifest)(this.options.config));
        results.push((0, sync_gaps_1.syncGaps)(this.options.config));
        results.push((0, sync_registry_1.syncRegistry)(this.options.config));
        this.pendingSync.clear();
        return results;
    }
}
exports.RealitySyncDaemon = RealitySyncDaemon;
function _basename(p) {
    return p.split(/[/\\]/).pop() || '';
}
//# sourceMappingURL=watcher.js.map