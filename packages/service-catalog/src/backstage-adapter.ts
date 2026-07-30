import { ServiceDefinition } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('backstage-adapter');

export interface BackstageEntity {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    description?: string;
    tags?: string[];
    annotations?: Record<string, string>;
  };
  spec?: Record<string, unknown>;
}

function serializeValue(v: unknown, indent: number): string {
  const pad = '  '.repeat(indent);
  if (typeof v === 'string') {
    if (v.length === 0) return "''";
    if (/[:[\]{}#,|>]/.test(v) || v.includes('\n') || v.trim() !== v) {
      return JSON.stringify(v);
    }
    return v;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return '\n' + v.map(item => `${pad}- ${serializeValue(item, indent + 1)}`).join('\n');
  }
  const entries = Object.entries(v as Record<string, unknown>).filter(([, val]) => val !== undefined);
  if (entries.length === 0) return '{}';
  return '\n' + entries.map(([k, val]) => {
    const serialized = serializeValue(val, indent + 1);
    if (serialized.startsWith('\n') || serialized === '{}') {
      return `${pad}${k}:${serialized}`;
    }
    return `${pad}${k}: ${serialized}`;
  }).join('\n');
}

function buildYamlDoc(obj: Record<string, unknown>): string {
  const body = serializeValue(obj, 0);
  return '---' + body + '\n';
}

export class BackstageAdapter {
  toBackstageEntity(service: ServiceDefinition): BackstageEntity {
    const kind = this._determineKind(service);
    const entity: BackstageEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind,
      metadata: {
        name: service.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: service.description,
        tags: service.tags.length > 0 ? service.tags : undefined,
        annotations: {
          'backstage.io/source-location': `url:${service.repository}`,
          'backstage.io/view-url': service.repository,
        },
      },
      spec: this._convertSpec(service, kind),
    };
    return entity;
  }

  toCatalogYaml(services: ServiceDefinition[]): string {
    const entities = services.map(s => this.toBackstageEntity(s));
    return entities.map(e => buildYamlDoc(e as unknown as Record<string, unknown>)).join('');
  }

  fromBackstageEntity(entity: BackstageEntity): ServiceDefinition {
    const name = entity.metadata.name;
    const kind = entity.kind;
    const tags = entity.metadata.tags ?? [];
    if (kind !== 'Component' && !tags.includes(kind.toLowerCase())) {
      tags.push(kind.toLowerCase());
    }
    return {
      id: name,
      name,
      description: entity.metadata.description ?? '',
      owner: (entity.spec?.owner as string) ?? 'unknown',
      language: kind === 'API' ? 'openapi' : 'typescript',
      tags,
      repository: entity.metadata.annotations?.['backstage.io/source-location']?.replace(/^url:/, '') ?? '',
      status: (entity.spec?.lifecycle === 'production' ? 'active' : 'planned') as 'active' | 'deprecated' | 'planned',
      score: 50,
      grade: 'C',
    };
  }

  _determineKind(service: ServiceDefinition): string {
    if (service.tags.includes('api')) return 'API';
    if (service.tags.includes('resource') || service.tags.includes('database')) return 'Resource';
    if (service.tags.includes('system')) return 'System';
    if (service.tags.includes('domain')) return 'Domain';
    if (service.tags.includes('group') || service.tags.includes('team')) return 'Group';
    if (service.tags.includes('user')) return 'User';
    return 'Component';
  }

  private _convertSpec(service: ServiceDefinition, kind: string): Record<string, unknown> {
    const spec: Record<string, unknown> = { lifecycle: this._mapStatus(service.status), owner: service.owner };
    switch (kind) {
      case 'Component':
        spec.type = 'service';
        spec.system = 'ideia';
        break;
      case 'API':
        spec.type = 'openapi';
        spec.system = 'ideia';
        break;
      case 'Resource':
        spec.type = 'database';
        spec.system = 'ideia';
        break;
      case 'System':
        spec.type = 'service';
        break;
      default:
        break;
    }
    return spec;
  }

  private _mapStatus(status: ServiceDefinition['status']): string {
    switch (status) {
      case 'active': return 'production';
      case 'deprecated': return 'deprecated';
      case 'planned': return 'experimental';
    }
  }
}
