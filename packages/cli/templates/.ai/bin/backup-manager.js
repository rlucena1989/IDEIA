const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const BACKUP_DIR = path.join(ROOT, '.ai/audit/backup');
const BACKUP_GIT_DIR = path.join(BACKUP_DIR, 'repo');
const ARCHIVE_DIR = path.join(BACKUP_DIR, 'archives');
const CONFIG_PATH = path.join(BACKUP_DIR, 'backup-config.json');
const LEDGER_PATH = path.join(ROOT, '.ai/audit/ledger.jsonl');

const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const GC_THRESHOLD = 0.80 * MAX_BYTES;
const ROTATE_THRESHOLD = 0.90 * MAX_BYTES;
const HARD_THRESHOLD = 0.97 * MAX_BYTES;

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) return { githubRemote: null, githubEnabled: false, maxBytes: MAX_BYTES };
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(cfg) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function sh(cmd, cwd) {
    return execSync(cmd, { cwd: cwd || BACKUP_GIT_DIR, stdio: 'pipe', encoding: 'utf-8' });
}

function ensureBackupRepo() {
    fs.mkdirSync(BACKUP_GIT_DIR, { recursive: true });
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    if (!fs.existsSync(path.join(BACKUP_GIT_DIR, '.git'))) {
        sh('git init -q', BACKUP_GIT_DIR);
        sh('git config user.email "ledger-backup@ai-devkit.local"', BACKUP_GIT_DIR);
        sh('git config user.name "AI-DevKit Backup Bot"', BACKUP_GIT_DIR);
    }
}

function dirSize(dir) {
    let total = 0;
    if (!fs.existsSync(dir)) return 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
    }
    return total;
}

function getBackupSize() { return dirSize(BACKUP_DIR); }

function commitToBackup(entry) {
    ensureBackupRepo();
    fs.copyFileSync(LEDGER_PATH, path.join(BACKUP_GIT_DIR, 'ledger.jsonl'));
    try {
        sh('git add ledger.jsonl');
        sh(`git commit -q --allow-empty -m "seq:${entry.seq} hash:${entry.thisHash.slice(0,12)} exit:${entry.exitCode}"`);
    } catch (e) {}
    enforceQuota();
    maybePushToGithub();
}

function enforceQuota() {
    const size = getBackupSize();
    if (size < GC_THRESHOLD) return { action: 'none', size };
    try { sh('git gc --aggressive --prune=now -q'); } catch (e) {}
    let newSize = getBackupSize();
    if (newSize < ROTATE_THRESHOLD) return { action: 'gc', size: newSize };
    rotateOldestHistory();
    newSize = getBackupSize();
    if (newSize >= HARD_THRESHOLD) { deleteOldestArchive(); newSize = getBackupSize(); }
    return { action: 'rotated', size: newSize };
}

function rotateOldestHistory() {
    const log = sh('git log --reverse --format=%H').trim().split('\n').filter(Boolean);
    if (log.length < 20) return;
    const cutIndex = Math.floor(log.length / 2);
    const cutCommit = log[cutIndex];
    const oldContent = sh(`git show ${log[0]}:ledger.jsonl`);
    const archiveName = `ledger-archive-${Date.now()}.jsonl.gz`;
    fs.writeFileSync(path.join(ARCHIVE_DIR, archiveName), zlib.gzipSync(oldContent));
    sh(`git checkout --orphan __rotated_tmp__ ${cutCommit}`);
    sh(`git commit -q -m "rotated-base referencia-arquivo:${archiveName}"`);
    try { sh('git branch -D master'); } catch (e) {}
    try { sh('git branch -D main'); } catch (e) {}
    sh('git branch -m master');
    sh('git gc --aggressive --prune=now -q');
}

function deleteOldestArchive() {
    const files = fs.readdirSync(ARCHIVE_DIR).map(f => ({ f, t: fs.statSync(path.join(ARCHIVE_DIR, f)).mtimeMs })).sort((a, b) => a.t - b.t);
    if (files.length === 0) return;
    fs.unlinkSync(path.join(ARCHIVE_DIR, files[0].f));
    console.warn(`⚠️ Cota de 2GB atingida. Arquivo mais antigo removido: ${files[0].f}. Configure GitHub para histórico ilimitado.`);
}

function configureGithub(remoteUrl) {
    ensureBackupRepo();
    try { sh('git remote remove origin'); } catch (e) {}
    sh(`git remote add origin ${remoteUrl}`);
    const cfg = loadConfig();
    cfg.githubRemote = remoteUrl;
    cfg.githubEnabled = true;
    saveConfig(cfg);
}

function maybePushToGithub() {
    const cfg = loadConfig();
    if (!cfg.githubEnabled || !cfg.githubRemote) return;
    try { sh('git push -u origin master --quiet 2>/dev/null || git push -u origin main --quiet 2>/dev/null'); }
    catch (e) { console.warn('⚠️ Push para GitHub falhou. Backup local permanece intacto.'); }
}

function status() {
    const size = getBackupSize();
    const cfg = loadConfig();
    return {
        sizeMB: (size / (1024 * 1024)).toFixed(2),
        quotaMB: (MAX_BYTES / (1024 * 1024)).toFixed(0),
        percentUsed: ((size / MAX_BYTES) * 100).toFixed(1),
        githubEnabled: cfg.githubEnabled,
        githubRemote: cfg.githubRemote,
        archiveCount: fs.existsSync(ARCHIVE_DIR) ? fs.readdirSync(ARCHIVE_DIR).length : 0,
    };
}

module.exports = { commitToBackup, enforceQuota, getBackupSize, configureGithub, status, ensureBackupRepo };
