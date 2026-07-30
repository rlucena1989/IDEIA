import { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@ideia/logger';
import url from 'node:url';
import { execFileSync } from 'node:child_process';
import { ApiContext, json} from './api-router-ctx';
const logger = createLogger('git-routes');

export function createGitRoutes(ctx: ApiContext): Record<string, (req: IncomingMessage, res: ServerResponse, parsed: url.UrlWithParsedQuery) => void | Promise<void>> {
  return {
    'GET /api/git/branch/compare': async (req, res, parsed) => {
      try {
        const rawBranch = parsed.query.branch as string || 'main';
        const branch = rawBranch.replace(/[^a-zA-Z0-9_\-./]/g, '');
        let log = '';
        let diffStat = '';
        try { log = execFileSync('git', ['log', '--oneline', `${branch}..HEAD`], { cwd: ctx.root, encoding: 'utf8', timeout: 10000 }).trim(); } catch { log = '(no changes)'; }
        try { diffStat = execFileSync('git', ['diff', branch, '--stat'], { cwd: ctx.root, encoding: 'utf8', timeout: 10000 }).trim(); } catch { diffStat = ''; }
        const commits = log.split('\n').filter(Boolean);
        json(res, { ok: true, branch, commits, diffStat, commitCount: commits.length });
      } catch {
        json(res, { ok: false, branch: '', commits: [], diffStat: '', commitCount: 0 });
      }
    },

    'GET /api/git/status': async (req, res) => {
      try {
        let porcelain = '', branch = '', ahead = '0', behind = '0';
        try { porcelain = execFileSync('git', ['status', '--porcelain', '-u'], { cwd: ctx.root, encoding: 'utf8', timeout: 10000 }).trim(); } catch { /* not a git repo */ }
        try { branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ctx.root, encoding: 'utf8', timeout: 5000 }).trim(); } catch { /* not a git repo */ }
        try { ahead = execFileSync('git', ['rev-list', '--count', '@{u}..HEAD'], { cwd: ctx.root, encoding: 'utf8', timeout: 5000 }).trim(); } catch { ahead = '0'; }
        try { behind = execFileSync('git', ['rev-list', '--count', 'HEAD..@{u}'], { cwd: ctx.root, encoding: 'utf8', timeout: 5000 }).trim(); } catch { behind = '0'; }

        const files: { path: string; status: string; staged: boolean }[] = [];
        for (const line of porcelain.split('\n').filter(Boolean)) {
          const xy = line.substring(0, 2);
          const filePath = line.substring(3).trim();
          const status = xy.trim() === '??' ? 'untracked'
            : xy.includes('M') ? 'modified'
            : xy.includes('A') ? 'added'
            : xy.includes('D') ? 'deleted'
            : xy.includes('R') ? 'renamed'
            : 'changed';
          files.push({ path: filePath, status, staged: xy[0] !== ' ' && xy[0] !== '?' });
        }

        json(res, {
          ok: true, branch: branch || null, ahead: parseInt(ahead) || 0,
          behind: parseInt(behind) || 0, files, isRepo: !!branch,
        });
      } catch {
        json(res, { ok: true, branch: null, files: [], isRepo: false, ahead: 0, behind: 0 });
      }
    },

    'GET /api/git/diff': async (req, res, parsed) => {
      try {
        const rawFile = parsed.query.file as string || '';
        const safeFile = rawFile.replace(/[^a-zA-Z0-9_\-./\\]/g, '');
        const args = safeFile ? ['diff', '--', safeFile] : ['diff', '--stat'];
        const diff = execFileSync('git', args, { cwd: ctx.root, encoding: 'utf8', timeout: 10000 }).trim();
        json(res, { ok: true, diff });
      } catch {
        json(res, { ok: true, diff: '' });
      }
    },
  };
}
