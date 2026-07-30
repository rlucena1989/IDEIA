import { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@ideia/logger';
import url from 'node:url';
import { execFileSync } from 'node:child_process';
import { ApiContext, json, error } from './api-router-ctx';
const logger = createLogger('preview-routes');

export function createPreviewRoutes(ctx: ApiContext): Record<string, (req: IncomingMessage, res: ServerResponse, parsed: url.UrlWithParsedQuery) => void | Promise<void>> {
  return {
    'GET /api/preview/report': async (req, res) => {
      try {
        const { parseGitDiff } = await import('@ideia/diff-engine');
        const memory = ctx.memoryStore.count();
        const audit = ctx.auditTrail.count();
        const session = ctx.session || ctx.getSession();

        let diffs: Array<{ file: string; linesAdded: number; linesRemoved: number; chunks: Array<{ type: 'add' | 'remove' | 'context'; content: string }> }> = [];
        try {
          const raw = execFileSync('git', ['diff', '--', '.'], { cwd: ctx.root, encoding: 'utf8', timeout: 10000 }).trim();
          if (raw) {
            const gitFiles = parseGitDiff(raw);
            diffs = gitFiles.map((f: { file: string; linesAdded: number; linesRemoved: number; hunks: Array<{ lines: Array<{ type: 'add' | 'remove' | 'context'; content: string }> }> }) => ({
              file: f.file,
              linesAdded: f.linesAdded,
              linesRemoved: f.linesRemoved,
              chunks: f.hunks.flatMap((h: { lines: Array<{ type: 'add' | 'remove' | 'context'; content: string }> }) => h.lines.map((l: { type: 'add' | 'remove' | 'context'; content: string }) => ({ type: l.type, content: l.content }))),
            }));
          }
        } catch { /* not a git repo */ }

        const totalAdded = diffs.reduce((s, d) => s + d.linesAdded, 0);
        const totalRemoved = diffs.reduce((s, d) => s + d.linesRemoved, 0);

        json(res, {
          ok: true,
          report: {
            diffs, totalFiles: diffs.length, totalAdded, totalRemoved,
            summary: `Session: ${session.session_id.slice(0, 8)}... | Policy: ${session.policy} | Files: ${diffs.length} changed (+${totalAdded}/-${totalRemoved}) | Memory: ${memory} | Audit: ${audit}`,
            score: diffs.length > 0 ? 100 : 0,
          },
          changes: diffs.map(d => ({
            file: d.file,
            risk: d.linesRemoved > 10 ? 'high' : d.linesAdded > 20 ? 'medium' : 'low',
            quality: 100,
            impact: `${d.linesAdded} additions, ${d.linesRemoved} deletions`,
            original: '', modified: '',
          })),
        });
      } catch {
        const session = ctx.session || ctx.getSession();
        json(res, {
          ok: true,
          report: { diffs: [], totalFiles: 0, totalAdded: 0, totalRemoved: 0, summary: `Session: ${session.session_id.slice(0, 8)}... | Policy: ${session.policy}`, score: 0 },
          changes: [],
        });
      }
    },

    'GET /api/preview/file': async (req, res, parsed) => {
      try {
        const relPath = parsed.query.path as string;
        if (!relPath) return error(res, 'path required');
        const { diffText } = await import('@ideia/diff-engine');

        let original = '';
        try {
          original = execFileSync('git', ['show', `HEAD:${relPath}`], { cwd: ctx.root, encoding: 'utf8', timeout: 5000 });
        } catch { /* not in git */ }

        const file = await ctx.fileBridge.readFile(relPath);
        const diff = diffText(original || file.content, file.content, relPath);

        json(res, {
          ok: true, file: relPath,
          original: original || file.content, modified: file.content,
          risk: diff.linesRemoved > 10 ? 'high' : diff.linesAdded > 20 ? 'medium' : 'low',
          quality: 100,
          impact: `+${diff.linesAdded}/-${diff.linesRemoved}`,
        });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },

    'POST /api/preview/approve': async (req, res) => {
      try {
        const body = await readBody(req);
        const { file } = JSON.parse(body);
        ctx.auditTrail.append({
          actor: 'user', eventType: 'preview.approve', target: file || 'all',
          decision: 'approved', result: 'success',
        });
        ctx.broadcast?.('preview:approve', { file: file || 'all' });
        json(res, { ok: true, decision: 'approved' });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },

    'POST /api/preview/reject': async (req, res) => {
      try {
        const body = await readBody(req);
        const { file, reason } = JSON.parse(body);
        ctx.auditTrail.append({
          actor: 'user', eventType: 'preview.reject', target: file || 'all',
          decision: 'rejected', result: 'failure',
          metadata: { reason },
        });
        ctx.broadcast?.('preview:reject', { file: file || 'all', reason });
        json(res, { ok: true, decision: 'rejected' });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}
