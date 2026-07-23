#!/usr/bin/env node
'use strict'

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT, info, warn, log } = require('./lib/common');

const SESSION_STATE_PATH = path.join(ROOT, '.ai/session-state.json');
const HANDOFF_PATH = path.join(ROOT, '.ai/context/ai-handoff.md');
const MANIFEST_PATH = path.join(ROOT, '.ai/project-manifest.yaml');
const STACK_PATH = path.join(ROOT, '.ai/stack.json');
const MODE_PATH = path.join(ROOT, '.ai/session-mode.json');
const MEMORY_DIR = path.join(ROOT, '.ai/memory');

function getGitStatus() {
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
        const log = execSync('git log -n 3 --oneline', { cwd: ROOT, encoding: 'utf8' }).trim();
        const status = execSync('git status --short', { cwd: ROOT, encoding: 'utf8' }).trim();
        return { branch, log, status };
    } catch {
        return { branch: 'unknown', log: '', status: '' };
    }
}

function getTimestamp() {
    const d = new Date();
    return d.toISOString().split('T')[0] + ' ' + d.toTimeString().split(' ')[0];
}

function buildContextBrief() {
    const now = getTimestamp();
    const git = getGitStatus();
    const brief = { generatedAt: now };
    const errors = [];

    // Stack
    if (fs.existsSync(STACK_PATH)) {
        try {
            brief.stack = JSON.parse(fs.readFileSync(STACK_PATH, 'utf8'));
        } catch { errors.push('stack.json parse failed'); }
    } else {
        brief.stack = 'not detected';
    }

    // Session mode
    if (fs.existsSync(MODE_PATH)) {
        try {
            brief.mode = JSON.parse(fs.readFileSync(MODE_PATH, 'utf8'));
        } catch { errors.push('session-mode.json parse failed'); }
    } else {
        brief.mode = 'development';
    }

    // Git
    brief.git = git;

    // Recent decisions
    const decisionsPath = path.join(MEMORY_DIR, 'decisions-log.md');
    if (fs.existsSync(decisionsPath)) {
        const content = fs.readFileSync(decisionsPath, 'utf8').split('\n').slice(0, 15).join('\n');
        brief.recentDecisions = content;
    }

    // Active task (from handoff)
    if (fs.existsSync(HANDOFF_PATH)) {
        const handoff = fs.readFileSync(HANDOFF_PATH, 'utf8');
        const taskMatch = handoff.match(/## Tarefa atual[\s\S]*?(?=\n## |\Z)/);
        if (taskMatch) {
            brief.activeTask = taskMatch[0].replace('## Tarefa atual', '').trim();
        }
    }

    // Open questions
    const questionsPath = path.join(MEMORY_DIR, 'open-questions.md');
    if (fs.existsSync(questionsPath)) {
        const qs = fs.readFileSync(questionsPath, 'utf8').split('\n').filter(l => l.startsWith('- [ ]') || l.startsWith('- ?')).length;
        brief.openQuestions = qs;
    }

    return { brief, errors };
}

function main() {
    info('Pre-Start Context Agent');

    const result = buildContextBrief();

    // Save session state
    const state = {
        sessionStart: result.brief.generatedAt,
        stack: result.brief.stack,
        mode: result.brief.mode,
        gitBranch: result.brief.git.branch,
        activeTask: result.brief.activeTask || '',
        openQuestions: result.brief.openQuestions || 0,
    };
    fs.mkdirSync(path.dirname(SESSION_STATE_PATH), { recursive: true });
    fs.writeFileSync(SESSION_STATE_PATH, JSON.stringify(state, null, 2));

    // Print context brief
    console.log('=== Context Brief ===');
    console.log(JSON.stringify(result.brief, null, 2));
    console.log('====================');

    if (result.errors.length > 0) {
        warn('Errors: ' + result.errors.join(', '));
    }

    log(`Session state saved to .ai/session-state.json`);
    log(`Branch: ${state.gitBranch}`);
    log(`Mode: ${typeof state.mode === 'object' ? state.mode.mode : state.mode}`);

    if (state.activeTask) {
        log(`Active task: ${state.activeTask}`);
    }
}

main();
