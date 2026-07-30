import { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@ideia/logger';
import url from 'node:url';
import { ApiContext, json, error } from './api-router-ctx';
import { withAgent } from './api-router-ctx';
const logger = createLogger('fs-routes');

export function createFsRoutes(ctx: ApiContext): Record<string, (req: IncomingMessage, res: ServerResponse, parsed: url.UrlWithParsedQuery) => void | Promise<void>> {
  return {
    'GET /api/fs/list': async (req, res, parsed) => {
      try {
        const relPath = (parsed.query.path as string) || '';
        const entries = await ctx.fileBridge.listDir(relPath);
        json(res, { ok: true, entries });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },

    'GET /api/fs/read': async (req, res, parsed) => {
      try {
        const relPath = parsed.query.path as string;
        if (!relPath) return error(res, 'path required');
        const result = await ctx.fileBridge.readFile(relPath);
        json(res, { ok: true, ...result });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },

    'POST /api/fs/write': async (req, res) => {
      try {
        const body = await readBody(req);
        const { path: relPath, content } = JSON.parse(body);
        const result = await withAgent(ctx, {
          actionType: 'file.write', resource: relPath,
          message: `Write file ${relPath}`,
        }, () => ctx.fileBridge.writeFile(relPath, content));
        if (!result.ok) return json(res, { ok: false, error: result.error, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, { ok: true, decision: 'auto' });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },

    'POST /api/fs/create': async (req, res) => {
      try {
        const body = await readBody(req);
        const { path: relPath, type } = JSON.parse(body);
        const actionType = type === 'dir' ? 'file.create.dir' : 'file.create';
        const result = await withAgent(ctx, {
          actionType, resource: relPath,
          message: `Create ${type} ${relPath}`,
        }, () => type === 'dir' ? ctx.fileBridge.createDir(relPath) : ctx.fileBridge.createFile(relPath));
        if (!result.ok) return json(res, { ok: false, error: result.error, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, { ok: true });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },

    'PATCH /api/fs/rename': async (req, res) => {
      try {
        const body = await readBody(req);
        const { oldPath, newPath } = JSON.parse(body);
        const result = await withAgent(ctx, {
          actionType: 'file.rename', resource: oldPath,
          message: `Rename ${oldPath} to ${newPath}`,
        }, () => ctx.fileBridge.rename(oldPath, newPath));
        if (!result.ok) return json(res, { ok: false, error: result.error, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, { ok: true });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },

    'DELETE /api/fs/delete': async (req, res, parsed) => {
      try {
        const relPath = parsed.query.path as string;
        if (!relPath) return error(res, 'path required');
        const result = await withAgent(ctx, {
          actionType: 'file.delete', resource: relPath, riskLevel: 'medium',
          message: `Delete ${relPath}`,
        }, () => ctx.fileBridge.delete(relPath));
        if (!result.ok) return json(res, { ok: false, error: result.error, decision: result.decision }, result.decision === 'block' ? 403 : 202);
        json(res, { ok: true });
      } catch (e) {
        error(res, (e as Error).message);
      }
    },

    'GET /api/fs/search': async (req, res, parsed) => {
      try {
        const pattern = parsed.query.q as string;
        if (!pattern) return error(res, 'query required');
        const results = await ctx.fileBridge.searchFiles(pattern);
        json(res, { ok: true, results });
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
