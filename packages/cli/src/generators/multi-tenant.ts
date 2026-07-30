import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa tenant.
 * @param entity - Valor entity.
 * @param options - Valor options.
 */
export function multiTenant(entity: string, options: GeneratorOptions): void {
  const vars = buildVars(entity);
  const base = 'src/{{name_kebab}}/multi-tenant';
  const files: FileEntry[] = [
    {
      path: `${base}/TenantAware.ts`,
      content: `import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenantId: string;
  schema?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return next(new Error('Tenant ID required'));
  }
  req.tenant = { tenantId, schema: \`tenant_\${tenantId}\` };
  next();
}
`,
    },
    {
      path: `${base}/TenantIsolation.ts`,
      content: `import { Request, Response, NextFunction } from 'express';

export function tenantIsolation(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.tenant?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'No tenant context' });
  }
  next();
}

export function filterByTenant<T extends { tenantId: string }>(items: T[], tenantId: string): T[] {
  return items.filter(item => item.tenantId === tenantId);
}
`,
    },
    {
      path: `.ai/policies/tenant-policy.md`,
      content: `# Tenant Policy: {{Name}}

## Isolation Model
- Type: Schema-based per tenant
- Data: All {{name}} data is isolated by tenant

## Middleware
- \`x-tenant-id\` header required on all API calls
- Tenant context validated on every request

## Security
- Cross-tenant access is strictly forbidden
- Tenant ID is never exposed in responses
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Multi-Tenant: ${entity}`, result, options.dryRun);
}
