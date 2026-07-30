"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitOpsManager = void 0;
exports.createGitOpsManager = createGitOpsManager;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DEFAULT_CONFIG = {
    enabled: true,
    provider: 'github-actions',
    repoPath: process.cwd(),
    manifestDir: '.deploy/manifests',
    branch: 'main',
    autoSync: false,
    syncIntervalMs: 300000,
    autoCommit: false,
};
class GitOpsManager {
    config;
    lastSyncResult;
    syncIntervalId;
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    async sync() {
        const start = Date.now();
        try {
            const currentCommit = this.execGit(['rev-parse', 'HEAD']);
            const _currentBranch = this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
            const remoteCommit = this.execGit(['ls-remote', 'origin', this.config.branch])
                .split('\t')[0] || '';
            const driftDetected = currentCommit.trim() !== remoteCommit.trim();
            const manifestPath = (0, node_path_1.join)(this.config.repoPath, this.config.manifestDir);
            let currentVersion;
            if ((0, node_fs_1.existsSync)(manifestPath)) {
                const versionFile = (0, node_path_1.join)(manifestPath, 'version.txt');
                if ((0, node_fs_1.existsSync)(versionFile)) {
                    currentVersion = (0, node_fs_1.readFileSync)(versionFile, 'utf-8').trim();
                }
            }
            const result = {
                success: true,
                provider: this.config.provider,
                currentCommit: currentCommit.trim(),
                currentVersion,
                driftDetected,
                lastSyncAt: new Date(Date.now() + (Date.now() - start)).toISOString(),
            };
            this.lastSyncResult = result;
            return result;
        }
        catch (_err) {
            const result = {
                success: false,
                provider: this.config.provider,
                currentCommit: '',
                driftDetected: false,
                lastSyncAt: new Date().toISOString(),
                error: String(_err),
            };
            this.lastSyncResult = result;
            return result;
        }
    }
    async applyManifest(manifest) {
        try {
            const manifestDir = (0, node_path_1.resolve)(this.config.repoPath, this.config.manifestDir);
            if (!(0, node_fs_1.existsSync)(manifestDir)) {
                const { mkdirSync } = require('node:fs');
                mkdirSync(manifestDir, { recursive: true });
            }
            const filePath = (0, node_path_1.join)(manifestDir, `${manifest.metadata.name}.json`);
            (0, node_fs_1.writeFileSync)(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
            const versionFilePath = (0, node_path_1.join)(manifestDir, 'version.txt');
            (0, node_fs_1.writeFileSync)(versionFilePath, manifest.spec.version, 'utf-8');
            if (this.config.autoCommit) {
                try {
                    this.execGit(['add', '-A']);
                    this.execGit(['commit', '-m', `deploy: ${manifest.spec.version} to ${manifest.spec.environment}`]);
                    try {
                        this.execGit(['push']);
                    }
                    catch {
                        // Push is optional
                    }
                }
                catch {
                    return false;
                }
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async detectDrift() {
        try {
            const status = this.execGit(['status', '--porcelain']);
            const changedFiles = status.split('\n').filter(Boolean);
            if (changedFiles.length === 0) {
                return { drifted: false, details: [] };
            }
            const details = changedFiles
                .filter(line => line.includes(this.config.manifestDir))
                .map(line => line.trim());
            return { drifted: details.length > 0, details };
        }
        catch {
            return { drifted: false, details: ['Failed to check drift'] };
        }
    }
    getLastSync() {
        return this.lastSyncResult;
    }
    startAutoSync() {
        if (this.syncIntervalId)
            return;
        this.syncIntervalId = setInterval(() => {
            this.sync().catch(() => { });
        }, this.config.syncIntervalMs);
    }
    stopAutoSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = undefined;
        }
    }
    execGit(args) {
        return (0, node_child_process_1.execFileSync)('git', args, {
            cwd: this.config.repoPath,
            encoding: 'utf-8',
            timeout: 15000,
            stdio: 'pipe',
        });
    }
}
exports.GitOpsManager = GitOpsManager;
function createGitOpsManager(config) {
    return new GitOpsManager(config);
}
//# sourceMappingURL=gitops.js.map