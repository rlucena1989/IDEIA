import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa trail.
 * @param entity - Valor entity.
 * @param options - Valor options.
 */
export function auditTrail(entity: string, options: GeneratorOptions): void {
  const vars = buildVars(entity);
  const base = 'src/{{name_kebab}}/audit';
  const files: FileEntry[] = [
    {
      path: `${base}/AuditEntry.ts`,
      content: `export type AuditAction = 'CREATED' | 'UPDATED' | 'DELETED' | 'VIEWED';

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actor: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
`,
    },
    {
      path: `${base}/AuditService.ts`,
      content: `import { AuditEntry, AuditAction } from './AuditEntry';

export class AuditService {
  private entries: AuditEntry[] = [];

  async log(params: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    actor: string;
    changes?: Record<string, { from: unknown; to: unknown }>;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actor: params.actor,
      changes: params.changes ?? {},
      timestamp: new Date(),
      metadata: params.metadata,
    };
    this.entries.push(entry);
    return entry;
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]> {
    return this.entries.filter(e => e.entityType === entityType && e.entityId === entityId);
  }
}
`,
    },
    {
      path: `${base}/__tests__/AuditService.test.ts`,
      content: `import { AuditService } from '../AuditService';

describe('AuditService', () => {
  const service = new AuditService();

  it('should log an entry', async () => {
    const entry = await service.log({
      entityType: '{{Name}}',
      entityId: '123',
      action: 'CREATED',
      actor: 'system',
    });
    expect(entry.id).toBeDefined();
    expect(entry.action).toBe('CREATED');
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Audit Trail: ${entity}`, result, options.dryRun);
}
