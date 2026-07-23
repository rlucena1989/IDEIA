const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const backupManager = require('./backup-manager.js');

const LEDGER_PATH = path.join(process.cwd(), '.ai/audit/ledger.jsonl');
const GENESIS_HASH = '0'.repeat(64);

function getGitHead() {
    try { return execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(); }
    catch (e) { return 'NO_GIT_REPO'; }
}

function getLastEntry() {
    if (!fs.existsSync(LEDGER_PATH)) return null;
    const lines = fs.readFileSync(LEDGER_PATH, 'utf-8').trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
}

function computeEntryHash(entry) {
    const payload = `${entry.prevHash}|${entry.seq}|${entry.timestamp}|${entry.command}|${entry.exitCode}|${entry.outputHash}|${entry.gitHead}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
}

function appendEntry(command, exitCode, output) {
    fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
    const last = getLastEntry();
    const seq = last ? last.seq + 1 : 0;
    const prevHash = last ? last.thisHash : GENESIS_HASH;
    const outputHash = crypto.createHash('sha256').update(output).digest('hex');
    const entry = { seq, timestamp: new Date().toISOString(), command, exitCode, outputHash, gitHead: getGitHead(), prevHash };
    entry.thisHash = computeEntryHash(entry);
    fs.appendFileSync(LEDGER_PATH, JSON.stringify(entry) + '\n');
    backupManager.commitToBackup(entry);
    return entry;
}

function verifyLedger() {
    if (!fs.existsSync(LEDGER_PATH)) {
        return { valid: true, message: 'Ledger vazio (nenhuma execução registrada ainda).', entries: 0 };
    }
    const lines = fs.readFileSync(LEDGER_PATH, 'utf-8').trim().split('\n').filter(Boolean);
    let expectedPrev = GENESIS_HASH;
    for (let i = 0; i < lines.length; i++) {
        const entry = JSON.parse(lines[i]);
        if (entry.seq !== i) return { valid: false, message: `Sequência corrompida na linha ${i + 1}`, brokenAt: i };
        if (entry.prevHash !== expectedPrev) return { valid: false, message: `Cadeia de hash QUEBRADA na linha ${i + 1}. Entrada editada ou removida.`, brokenAt: i };
        const recomputed = computeEntryHash({ ...entry, thisHash: undefined });
        if (recomputed !== entry.thisHash) return { valid: false, message: `Hash da entrada ${i + 1} não confere. Conteúdo ADULTERADO.`, brokenAt: i };
        expectedPrev = entry.thisHash;
    }
    return { valid: true, message: `✅ Cadeia íntegra. ${lines.length} execuções verificadas.`, entries: lines.length };
}

module.exports = { appendEntry, verifyLedger, getLastEntry };
