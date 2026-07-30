import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa endpoint.
 * @param resource - Valor resource.
 * @param options - Valor options.
 */
export function permissionEndpoint(resource: string, options: GeneratorOptions): void {
  const vars = buildVars(resource);
  const targetDir = 'src/{{name_kebab}}/api';
  const files: FileEntry[] = [
    {
      path: `${targetDir}/{{Name}}Controller.ts`,
      content: `import { Router, Request, Response } from 'express';

const router = Router();

const PERMISSIONS = {
  CREATE: '{{name}}:create',
  READ: '{{name}}:read',
  UPDATE: '{{name}}:update',
  DELETE: '{{name}}:delete',
} as const;

function checkPermission(req: Request, permission: string): boolean {
  const user = (req as Record<string, unknown>).user;
  return user?.permissions?.includes(permission) ?? false;
}

function requirePermission(permission: string) {
  return (req: Request, res: Response, next: Function) => {
    if (!checkPermission(req, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

router.post('/{{name_kebab}}', requirePermission(PERMISSIONS.CREATE), (req: Request, res: Response) => {
  res.status(201).json({ message: '{{Name}} created' });
});

router.get('/{{name_kebab}}', requirePermission(PERMISSIONS.READ), (req: Request, res: Response) => {
  res.json({ data: [] });
});

router.get('/{{name_kebab}}/:id', requirePermission(PERMISSIONS.READ), (req: Request, res: Response) => {
  res.json({ data: { id: req.params.id } });
});

router.put('/{{name_kebab}}/:id', requirePermission(PERMISSIONS.UPDATE), (req: Request, res: Response) => {
  res.json({ message: '{{Name}} updated' });
});

router.delete('/{{name_kebab}}/:id', requirePermission(PERMISSIONS.DELETE), (req: Request, res: Response) => {
  res.json({ message: '{{Name}} deleted' });
});

export default router;
`,
    },
    {
      path: `${targetDir}/__tests__/{{Name}}Controller.test.ts`,
      content: `import request from 'supertest';
import express from 'express';
import router from '../{{Name}}Controller';

const app = express();
app.use(express.json());
app.use(router);

describe('{{Name}}Controller', () => {
  it('should return 403 without permission', async () => {
    const res = await request(app).get('/{{name_kebab}}');
    expect(res.status).toBe(403);
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Permission Endpoint: ${resource}`, result, options.dryRun);
}
