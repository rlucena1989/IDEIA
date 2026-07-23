#!/usr/bin/env node
'use strict'

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT, info, warn, log, fail } = require('./lib/common');

const SESSION_STATE_PATH = path.join(ROOT, '.ai/session-state.json');
const MEMORY_DIR = path.join(ROOT, '.ai/memory');
const DECISIONS_LOG = path.join(MEMORY_DIR, 'decisions-log.md');
const SESSION_LOG = path.join(MEMORY_DIR, 'session-log.md');
const AGENT_LOG = path.join(MEMORY_DIR, 'agent-activity-log.md');
const HANDOFF_PATH = path.join(ROOT, '.ai/context/ai-handoff.md');

function getTimestamp() {
    const d = new Date();
    return d.toISOString().split('T')[0] + ' ' + d.toTimeString().split(' ')[0];
}

function getGitDiff() {
    try {
        const diff = execSync('git diff --stat', { cwd: ROOT, encoding: 'utf8' }).trim();
        const filesChanged = diff ? diff.split('\n').length : 0;
        return { diff, filesChanged };
    } catch {
        return { diff: '', filesChanged: 0 };
    }
}

function appendDecision(decision, context) {
    const date = new Date().toISOString().split('T')[0];
    const entry = `| ${date} | ${decision} | ${context} | Documentar e lembrar na proxima sessao |\n`;

    fs.mkdirSync(path.dirname(DECISIONS_LOG), { recursive: true });
    if (!fs.existsSync(DECISIONS_LOG)) {
        const header = '# Registro de Decisoes (Decisions Log)\n';
        const infoLine = '> Versao: 1.0 | Atualizado em: ' + date + '\n\n';
        const tableHeader = '| Data | Decisao | Contexto | Impacto / Acao exigida da IA |\n|---|---|---|---|\n';
        fs.writeFileSync(DECISIONS_LOG, header + infoLine + tableHeader + entry);
    } else {
        const content = fs.readFileSync(DECISIONS_LOG, 'utf8');
        const lines = content.trim().split('\n');
        const insertAt = lines.length - 1;
        lines.splice(insertAt, 0, entry.trimEnd());
        fs.writeFileSync(DECISIONS_LOG, lines.join('\n') + '\n');
    }
    info(`Decision recorded: ${decision}`);
}

function appendSessionLog(summary, decisions, nextTask) {
    const now = getTimestamp();
    const entry = `\n---\n\n## Sessao -- ${now}\n\n### O que foi feito\n${summary}\n\n### Decisoes tomadas\n${decisions}\n\n### Proxima sessao deve comecar por\n${nextTask}\n`;

    fs.mkdirSync(path.dirname(SESSION_LOG), { recursive: true });
    if (!fs.existsSync(SESSION_LOG)) {
        fs.writeFileSync(SESSION_LOG, '# Diario de Sessoes\n' + entry);
    } else {
        fs.appendFileSync(SESSION_LOG, entry);
    }
    log(`Session log updated`);
}

function updateHandoffObjective(objective) {
    if (!fs.existsSync(HANDOFF_PATH)) return;
    try {
        let handoff = fs.readFileSync(HANDOFF_PATH, 'utf8');
        const taskSectionMatch = handoff.match(/## Tarefa atual[\s\S]*?(?=\n## |\Z)/);
        if (taskSectionMatch) {
            const newSection = `## Tarefa atual\n${objective}`;
            handoff = handoff.replace(taskSectionMatch[0], newSection);
            fs.writeFileSync(HANDOFF_PATH, handoff);
            log('Handoff task section updated');
        }
    } catch {
        warn('Failed to update handoff');
    }
}

function main() {
    info('Post-Start Validation Agent');

    const state = fs.existsSync(SESSION_STATE_PATH)
        ? JSON.parse(fs.readFileSync(SESSION_STATE_PATH, 'utf8'))
        : null;

    if (!state) {
        warn('No session state found. Run pre-start-context first.');
    }

    // Read session summary passed via CLI args or env
    const sessionSummary = process.env.AI_SESSION_SUMMARY || 'No summary provided.';
    const decisions = process.env.AI_SESSION_DECISIONS || 'No decisions recorded.';
    const nextTask = process.env.AI_SESSION_NEXT_TASK || 'Review session log and continue development.';

    // Record decisions
    if (process.env.AI_SESSION_DECISIONS && process.env.AI_SESSION_DECISIONS !== 'No decisions recorded.') {
        const decisionList = process.env.AI_SESSION_DECISIONS.split(';');
        for (const d of decisionList) {
            const trimmed = d.trim();
            if (trimmed) appendDecision(trimmed, `Session: ${state?.sessionStart || 'unknown'}`);
        }
    }

    // Git diff stats
    const git = getGitDiff();
    if (git.filesChanged > 0) {
        log(`${git.filesChanged} file(s) changed this session`);
    }

    // Append session log
    appendSessionLog(sessionSummary, decisions, nextTask);

    // Update handoff
    if (nextTask && nextTask !== 'Review session log and continue development.') {
        updateHandoffObjective(nextTask);
    }

    // Cleanup session state
    if (state) {
        fs.unlinkSync(SESSION_STATE_PATH);
        info('Session state cleaned up');
    }

    log('Post-start validation complete');
}

main();
