import crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('api-router-routes');

import { ApiContext, RouteHandler, json, error, readBody, withAgent } from './api-router-helpers';
import { createApprovalRequest, approveAction } from '../governance/approval-flow';

export function createFileSystemRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'GET /api/fs/list': async (req, res, parsed) => {
      try {
        const relPath = (parsed.query.path as string) || '';
        const entries = await ctx.fileBridge.listDir(relPath);
        json(res, { ok: true, entries });
      } catch (e) { error(res, (e as Error).message); }
    },
    'GET /api/fs/read': async (req, res, parsed) => {
      try {
        const relPath = parsed.query.path as string;
        if (!relPath) return error(res, 'path required');
        const result = await ctx.fileBridge.readFile(relPath);
        json(res, { ok: true, ...result });
      } catch (e) { error(res, (e as Error).message); }
    },
    'POST /api/fs/write': async (req, res) => {
      try {
        const body = await readBody(req);
        const { path: relPath, content } = JSON.parse(body);
        const result = await withAgent(ctx, { actionType: 'file.write', resource: relPath, message: `Write file ${relPath}` }, () => ctx.fileBridge.writeFile(relPath, content));
        if (!result.ok) return json(res, { ok: false, error: result.error, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, { ok: true, decision: 'auto' });
      } catch (e) { error(res, (e as Error).message); }
    },
    'POST /api/fs/create': async (req, res) => {
      try {
        const body = await readBody(req);
        const { path: relPath, type } = JSON.parse(body);
        const actionType = type === 'dir' ? 'file.create.dir' : 'file.create';
        const result = await withAgent(ctx, { actionType, resource: relPath, message: `Create ${type} ${relPath}` }, () => type === 'dir' ? ctx.fileBridge.createDir(relPath) : ctx.fileBridge.createFile(relPath));
        if (!result.ok) return json(res, { ok: false, error: result.error, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, { ok: true });
      } catch (e) { error(res, (e as Error).message); }
    },
    'PATCH /api/fs/rename': async (req, res) => {
      try {
        const body = await readBody(req);
        const { oldPath, newPath } = JSON.parse(body);
        const result = await withAgent(ctx, { actionType: 'file.rename', resource: oldPath, message: `Rename ${oldPath} to ${newPath}` }, () => ctx.fileBridge.rename(oldPath, newPath));
        if (!result.ok) return json(res, { ok: false, error: result.error, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, { ok: true });
      } catch (e) { error(res, (e as Error).message); }
    },
    'DELETE /api/fs/delete': async (req, res, parsed) => {
      try {
        const relPath = parsed.query.path as string;
        if (!relPath) return error(res, 'path required');
        const result = await withAgent(ctx, { actionType: 'file.delete', resource: relPath, riskLevel: 'medium', message: `Delete ${relPath}` }, () => ctx.fileBridge.delete(relPath));
        if (!result.ok) return json(res, { ok: false, error: result.error, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, { ok: true });
      } catch (e) { error(res, (e as Error).message); }
    },
    'GET /api/fs/search': async (req, res, parsed) => {
      try {
        const pattern = parsed.query.q as string;
        if (!pattern) return error(res, 'query required');
        const results = await ctx.fileBridge.searchFiles(pattern);
        json(res, { ok: true, results });
      } catch (e) { error(res, (e as Error).message); }
    },
  };
}

export function createTerminalSessionRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'POST /api/shell': async (req, res) => {
      try {
        const body = await readBody(req);
        const { command, approved } = JSON.parse(body);
        const classification = ctx.terminalBridge.classifyCommand(command);
        const riskLevel = classification === 'high-risk' || classification === 'blocked' ? 'high' : 'low';
        const result = await withAgent(ctx, { actionType: 'shell.exec', resource: command.substring(0, 100), riskLevel, message: `Execute: ${command.substring(0, 100)}` }, () => classification === 'high-risk' ? ctx.terminalBridge.executeHighRisk(command, approved === true) : ctx.terminalBridge.execute(command));
        if (!result.ok) return json(res, { ok: false, output: '', error: result.error, code: null, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, result.data);
      } catch (e) { error(res, (e as Error).message); }
    },
    'POST /api/session': async (req, res) => {
      try {
        const body = await readBody(req);
        const { root } = JSON.parse(body);
        const { createSession } = await import('./session-manager');
        const session = createSession(root || process.cwd());
        ctx.session = session;
        ctx.broadcast?.('session:change', { sessionId: session.session_id, action: 'created' });
        json(res, { ok: true, session });
      } catch (e) { error(res, (e as Error).message); }
    },
    'GET /api/session': async (req, res) => {
      const session = ctx.session || ctx.getSession();
      json(res, { ok: true, session });
    },
    'GET /api/commands': async (req, res) => { json(res, { commands: ctx.commands }); },
  };
}

export function createPreviewRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'GET /api/preview/report': async (req, res) => {
      try {
        const { parseGitDiff } = await import('@ideia/diff-engine');
        const { execFileSync } = await import('node:child_process');
        const diffs = await getGitDiffs(ctx, execFileSync, parseGitDiff);
        const totalAdded = diffs.reduce((s, d) => s + d.linesAdded, 0);
        const totalRemoved = diffs.reduce((s, d) => s + d.linesRemoved, 0);
        const session = ctx.session || ctx.getSession();
        json(res, {
          ok: true,
          report: { diffs, totalFiles: diffs.length, totalAdded, totalRemoved, summary: `Session: ${session.session_id.slice(0, 8)}... | Policy: ${session.policy} | Files: ${diffs.length} changed (+${totalAdded}/-${totalRemoved}) | Memory: ${ctx.memoryStore.count()} | Audit: ${ctx.auditTrail.count()}`, score: diffs.length > 0 ? 100 : 0 },
          changes: diffs.map(d => ({ file: d.file, risk: d.linesRemoved > 10 ? 'high' : d.linesAdded > 20 ? 'medium' : 'low', quality: 100, impact: `${d.linesAdded} additions, ${d.linesRemoved} deletions`, original: '', modified: '' })),
        });
      } catch {
        const session = ctx.session || ctx.getSession();
        json(res, { ok: true, report: { diffs: [], totalFiles: 0, totalAdded: 0, totalRemoved: 0, summary: `Session: ${session.session_id.slice(0, 8)}... | Policy: ${session.policy}`, score: 0 }, changes: [] });
      }
    },
    'GET /api/preview/file': async (req, res, parsed) => {
      try {
        const relPath = parsed.query.path as string;
        if (!relPath) return error(res, 'path required');
        const { diffText } = await import('@ideia/diff-engine');
        const { execFileSync } = await import('node:child_process');
        let original = '';
        try { original = execFileSync('git', ['show', `HEAD:${relPath}`], { cwd: ctx.root, encoding: 'utf8', timeout: 5000 }); } catch { /* */ }
        const file = await ctx.fileBridge.readFile(relPath);
        const diff = diffText(original || file.content, file.content, relPath);
        json(res, { ok: true, file: relPath, original: original || file.content, modified: file.content, risk: diff.linesRemoved > 10 ? 'high' : diff.linesAdded > 20 ? 'medium' : 'low', quality: 100, impact: `+${diff.linesAdded}/-${diff.linesRemoved}` });
      } catch (e) { error(res, (e as Error).message); }
    },
    'POST /api/preview/approve': async (req, res) => {
      try {
        const body = await readBody(req);
        const { file } = JSON.parse(body);
        ctx.auditTrail.append({ actor: 'user', eventType: 'preview.approve', target: file || 'all', decision: 'approved', result: 'success' });
        ctx.broadcast?.('preview:approve', { file: file || 'all' });
        json(res, { ok: true, decision: 'approved' });
      } catch (e) { error(res, (e as Error).message); }
    },
    'POST /api/preview/reject': async (req, res) => {
      try {
        const body = await readBody(req);
        const { file, reason } = JSON.parse(body);
        ctx.auditTrail.append({ actor: 'user', eventType: 'preview.reject', target: file || 'all', decision: 'rejected', result: 'failure', metadata: { reason } });
        ctx.broadcast?.('preview:reject', { file: file || 'all', reason });
        json(res, { ok: true, decision: 'rejected' });
      } catch (e) { error(res, (e as Error).message); }
    },
  };
}

export function createApprovalRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'POST /api/approval/request': async (req, res) => {
      try {
        const body = await readBody(req);
        const { action, reason } = JSON.parse(body);
        const request = createApprovalRequest({ action, requestedBy: 'ai', reason });
        ctx.auditTrail.append({ actor: 'ai', eventType: 'approval.request', target: action, decision: 'ask', result: 'pending', metadata: { reason, approvalId: request.approvalId } });
        ctx.broadcast?.('approval:request', { action, approvalId: request.approvalId, reason });
        json(res, { ok: true, request });
      } catch (e) { error(res, (e as Error).message); }
    },
    'POST /api/approval/respond': async (req, res) => {
      try {
        const body = await readBody(req);
        const { action, approved, approver } = JSON.parse(body);
        const result = approveAction({ approvalId: 'manual', action, requestedBy: 'ai', requestedAt: new Date().toISOString(), reason: '', status: 'pending' as const, requiredLevel: 'dev' as const, currentLevel: 'dev' as const, deadlineMs: 300000, createdAt: Date.now() }, approved, approver);
        ctx.auditTrail.append({ actor: 'user', eventType: 'approval.respond', target: action, decision: approved ? 'approved' : 'rejected', result: approved ? 'success' : 'failure', metadata: { approver } });
        ctx.broadcast?.('approval:respond', { action, approved, approver });
        json(res, { ok: true, result });
      } catch (e) { error(res, (e as Error).message); }
    },
  };
}

export function createMemoryRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'GET /api/memory': async (req, res) => { json(res, { ok: true, records: ctx.memoryStore.list() }); },
    'POST /api/memory': async (req, res) => {
      try {
        const body = await readBody(req);
        const { category, summary, detail, tags, severity } = JSON.parse(body);
        ctx.memoryStore.append({ memoryId: crypto.randomUUID(), category: category || 'change', source: detail || summary || '', summary: summary || '', tags: tags || [], severity: severity || 'low', createdAt: new Date().toISOString() });
        ctx.broadcast?.('memory:update', { category, summary });
        json(res, { ok: true });
      } catch (e) { error(res, (e as Error).message); }
    },
  };
}

export function createStatusRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'GET /api/ide/status': async (req, res) => {
      const session = ctx.session || ctx.getSession();
      json(res, { ok: true, version: '0.1.0', session: session?.session_id || null, workspace: session?.workspace_root || null, policy: session?.policy || 'ask', memoryCount: ctx.memoryStore.count(), terminalHistory: ctx.terminalBridge.getHistory().length, uptime: process.uptime() });
    },
    'GET /api/audit': async (req, res) => {
      try { const events = ctx.auditTrail.load(); json(res, { ok: true, count: events.length, events }); } catch (e) { error(res, (e as Error).message); }
    },
    'GET /api/health': async (req, res) => {
      const checks: Record<string, { status: string; latency?: number }> = {};
      const start = Date.now();
      try { ctx.fileBridge.listDir('.'); checks.filesystem = { status: 'ok' }; } catch { checks.filesystem = { status: 'error' }; }
      checks.filesystem.latency = Date.now() - start;
      try { ctx.memoryStore.count(); checks.memory = { status: 'ok' }; } catch { checks.memory = { status: 'error' }; }
      try { ctx.auditTrail.count(); checks.audit = { status: 'ok' }; } catch { checks.audit = { status: 'error' }; }
      try { ctx.terminalBridge.getHistory(); checks.terminal = { status: 'ok' }; } catch { checks.terminal = { status: 'error' }; }
      const session = ctx.session || ctx.getSession();
      checks.session = { status: session ? 'ok' : 'error' };
      json(res, { status: Object.values(checks).every(c => c.status === 'ok') ? 'healthy' : 'degraded', timestamp: new Date().toISOString(), uptime: process.uptime(), version: '0.1.0', memory: { heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), rss: Math.round(process.memoryUsage().rss / 1024 / 1024), unit: 'MB' }, checks });
    },
    'GET /api/quality': async (req, res) => {
      json(res, { dimensions: [{ name: 'Código', score: 80, target: 80, status: 'pass' }, { name: 'Segurança', score: 90, target: 90, status: 'pass' }, { name: 'Performance', score: 70, target: 80, status: 'warn' }, { name: 'UX', score: 60, target: 75, status: 'warn' }, { name: 'Integração', score: 85, target: 85, status: 'pass' }, { name: 'Resiliência', score: 75, target: 80, status: 'warn' }, { name: 'Dados', score: 65, target: 75, status: 'warn' }], overallScore: 75, timestamp: new Date().toISOString() });
    },
  };
}

export function createTaskRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'GET /api/tasks': async (req, res) => { json(res, { ok: true, tasks: ctx.session?.active_tasks?.map(t => ({ id: t, title: t, status: 'running' as const, progress: 50 })) || [] }); },
    'POST /api/tasks': async (req, res) => {
      try {
        const body = await readBody(req);
        const { title } = JSON.parse(body);
        const taskId = `task_${Date.now()}`;
        const session = ctx.getSession();
        session.active_tasks.push(title);
        ctx.broadcast?.('task:update', { task: { id: taskId, title, status: 'running', progress: 0 } });
        json(res, { ok: true, taskId });
      } catch (e) { error(res, (e as Error).message); }
    },
    'PATCH /api/tasks/:id': async (req, res) => {
      try {
        const body = await readBody(req);
        const { id, status, progress } = JSON.parse(body);
        ctx.broadcast?.('task:update', { task: { id, title: id, status: status || 'running', progress: progress || 0 } });
        json(res, { ok: true });
      } catch (e) { error(res, (e as Error).message); }
    },
  };
}

export function createProviderRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'GET /api/settings/providers': async (req, res) => {
      try {
        const { loadConfig } = await import('../local-ai/config');
        const { getProviderStatus, testLatency } = await import('../local-ai/provider-router');
        const config = loadConfig(ctx.root);
        const status = getProviderStatus(ctx.root);
        const latencies = await testLatency(ctx.root);
        json(res, { ok: true, priority: config.provider_priority, providers: status.map(s => ({ ...s, latencyMs: latencies.find(l => l.provider === s.name)?.latencyMs || 0, healthy: latencies.find(l => l.provider === s.name)?.healthy || false })), configs: config.provider_configs });
      } catch (e) { error(res, (e as Error).message); }
    },
    'POST /api/settings/providers/priority': async (req, res) => {
      try {
        const body = await readBody(req);
        const { priority } = JSON.parse(body);
        if (!Array.isArray(priority)) return error(res, 'priority must be an array');
        const { setProviderPriority } = await import('../local-ai/config');
        setProviderPriority(ctx.root, priority);
        json(res, { ok: true, priority });
      } catch (e) { error(res, (e as Error).message); }
    },
    'POST /api/settings/providers/config': async (req, res) => {
      try {
        const body = await readBody(req);
        const { provider, config: providerCfg } = JSON.parse(body);
        if (!provider || typeof provider !== 'string') return error(res, 'provider name required');
        const { setProviderConfig } = await import('../local-ai/config');
        setProviderConfig(ctx.root, provider, providerCfg);
        json(res, { ok: true });
      } catch (e) { error(res, (e as Error).message); }
    },
  };
}

export function createWorkspaceRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'GET /api/workspace/config': async (req, res) => {
      try { const { loadConfig } = await import('../local-ai/config'); json(res, { ok: true, config: loadConfig(ctx.root) }); } catch (e) { json(res, { ok: false, config: null, error: (e as Error).message }); }
    },
    'POST /api/workspace/config': async (req, res) => {
      try { const body = await readBody(req); const updates = JSON.parse(body); const { saveConfig } = await import('../local-ai/config'); json(res, { ok: true, config: saveConfig(ctx.root, updates) }); } catch (e) { error(res, (e as Error).message); }
    },
  };
}

export function createGitRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  const execGit = async (args: string[], timeout = 10000): Promise<string> => {
    try { const { execFileSync } = await import('node:child_process'); return execFileSync('git', args, { cwd: ctx.root, encoding: 'utf8', timeout }).trim(); } catch { return ''; }
  };
  return {
    'GET /api/git/branch/compare': async (req, res, parsed) => {
      const branch = ((parsed.query.branch as string) || 'main').replace(/[^a-zA-Z0-9_\-./]/g, '');
      const log = await execGit(['log', '--oneline', `${branch}..HEAD`]);
      const diffStat = await execGit(['diff', branch, '--stat']);
      const commits = log.split('\n').filter(Boolean);
      json(res, { ok: true, branch, commits, diffStat, commitCount: commits.length });
    },
    'GET /api/git/status': async (req, res) => {
      const porcelain = await execGit(['status', '--porcelain', '-u']);
      const branch = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], 5000);
      const ahead = parseInt(await execGit(['rev-list', '--count', '@{u}..HEAD'], 5000)) || 0;
      const behind = parseInt(await execGit(['rev-list', '--count', 'HEAD..@{u}'], 5000)) || 0;
      const files = porcelain.split('\n').filter(Boolean).map(line => {
        const xy = line.substring(0, 2); const filePath = line.substring(3).trim();
        const status = xy.trim() === '??' ? 'untracked' : xy.includes('M') ? 'modified' : xy.includes('A') ? 'added' : xy.includes('D') ? 'deleted' : xy.includes('R') ? 'renamed' : 'changed';
        return { path: filePath, status, staged: xy[0] !== ' ' && xy[0] !== '?' };
      });
      json(res, { ok: true, branch: branch || null, ahead, behind, files, isRepo: !!branch });
    },
    'GET /api/git/diff': async (req, res, parsed) => {
      const safeFile = ((parsed.query.file as string) || '').replace(/[^a-zA-Z0-9_\-./\\]/g, '');
      const diff = await execGit(safeFile ? ['diff', '--', safeFile] : ['diff', '--stat']);
      json(res, { ok: true, diff });
    },
  };
}

export function createDiagnosticsRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'GET /api/diagnostics': async (req, res) => {
      try {
        const { execFileSync } = await import('node:child_process');
        const problems: { file: string; line: number; column: number; message: string; severity: 'error' | 'warning' }[] = [];
        try { const tscOut = execFileSync('npx', ['tsc', '--noEmit'], { cwd: ctx.root, encoding: 'utf8', timeout: 30000 }); for (const line of tscOut.split('\n')) { const m = line.match(/^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+(.+)$/); if (m) { problems.push({ file: m[1]?.trim() ?? '', line: parseInt(m[2]), column: parseInt(m[3]), severity: m[4] as 'error' | 'warning', message: m[5]?.trim() ?? '' }); } } } catch { /* */ }
        try { const eslintOut = execFileSync('npx', ['eslint', '.', '--format', 'unix'], { cwd: ctx.root, encoding: 'utf8', timeout: 30000 }); for (const line of eslintOut.split('\n')) { const m = line.match(/^(.+):(\d+):(\d+):\s+(error|warning)\s+(.+)$/); if (m && m[1]) { const file = m[1].replace(ctx.root.replace(/\\/g, '/'), '').replace(/^\//, ''); problems.push({ file: file || m[1].trim(), line: parseInt(m[2]), column: parseInt(m[3]), severity: m[4] as 'error' | 'warning', message: m[5]?.trim() ?? '' }); } } } catch { /* */ }
        const errors = problems.filter(p => p.severity === 'error').length;
        const warnings = problems.filter(p => p.severity === 'warning').length;
        ctx.broadcast?.('diagnostics:update', { count: problems.length, errors, warnings, timestamp: new Date().toISOString() });
        json(res, { ok: true, problems, count: problems.length, errors, warnings });
      } catch { ctx.broadcast?.('diagnostics:update', { count: 0, errors: 0, warnings: 0, timestamp: new Date().toISOString() }); json(res, { ok: true, problems: [], count: 0, errors: 0, warnings: 0 }); }
    },
  };
}

export function createMiscRoutes(ctx: ApiContext): Record<string, RouteHandler> {
  return {
    'POST /api/sandbox/exec': async (req, res) => {
      try {
        const body = await readBody(req);
        const { code, language, timeout } = JSON.parse(body);
        if (!code) return error(res, 'code required');
        const result = await withAgent(ctx, { actionType: 'sandbox.exec', riskLevel: 'high', message: `Execute sandbox: ${code.substring(0, 80)}` }, async () => { const { runInSandbox } = await import('./sandbox'); return runInSandbox(ctx.root, { code, language, timeout }); });
        if (!result.ok) return json(res, { ok: false, output: '', error: result.error, durationMs: 0, memoryMb: 0 }, result.decision === 'block' ? 403 : 202);
        json(res, { ...result.data });
      } catch (e) { json(res, { ok: false, output: '', error: (e as Error).message, durationMs: 0, memoryMb: 0 }); }
    },
    'GET /api/control/status': async (req, res) => { json(res, { autonomyLevel: ctx.session?.policy ?? 'supervised', activeAgents: 0, pendingApprovals: 0, safetyBreaker: 'closed', recentDecisions: [] }); },
    'POST /api/control/command': async (req, res) => { const body = await readBody(req); const { command } = JSON.parse(body); json(res, { ok: true, command, result: `Control command "${command}" acknowledged`, timestamp: new Date().toISOString() }); },
    'GET /api/self/status': async (req, res) => { json(res, { enabled: true, metrics: { codeQuality: 85, testCoverage: 30, performance: 70, security: 90 }, suggestions: [], lastScan: new Date().toISOString() }); },
  };
}

async function getGitDiffs(ctx: ApiContext, execFileSync: typeof import('node:child_process').execFileSync, parseGitDiff: (raw: string) => Array<{ file: string; linesAdded: number; linesRemoved: number; hunks: Array<{ lines: Array<{ type: string; content: string }> }> }>): Promise<Array<{ file: string; linesAdded: number; linesRemoved: number; chunks: Array<{ type: string; content: string }> }>> {
  try {
    const raw = execFileSync('git', ['diff', '--', '.'], { cwd: ctx.root, encoding: 'utf8', timeout: 10000 }).trim();
    if (!raw) return [];
    return parseGitDiff(raw).map(f => ({ file: f.file, linesAdded: f.linesAdded, linesRemoved: f.linesRemoved, chunks: f.hunks.flatMap(h => h.lines.map(l => ({ type: l.type, content: l.content }))) }));
  } catch { return []; }
}
