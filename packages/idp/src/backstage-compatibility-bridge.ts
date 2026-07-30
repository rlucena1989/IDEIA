import { BackstageEntity, CatalogEntry, ServiceDefinition } from './types';
import { createLogger } from '@ideia/logger';
import { ServiceCatalog } from './service-catalog';
const logger = createLogger('backstage-compatibility-bridge');

export class BackstageCompatibilityBridge {
  private _baseUrl: string;

  constructor(private _catalog: ServiceCatalog, baseUrl = 'https://backstage.example.com') {
    this._baseUrl = baseUrl;
  }

  toBackstageEntity(entry: CatalogEntry): BackstageEntity {
    return {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: entry.service.name,
        description: `${entry.service.type} service owned by ${entry.service.owner}`,
        tags: entry.service.tags,
        annotations: {
          'ideia.dev/service-type': entry.service.type,
          'ideia.dev/quality-score': String(entry.score),
          'ideia.dev/quality-grade': entry.grade,
          'ideia.dev/last-updated': String(Date.now()),
        },
      },
      spec: {
        type: entry.service.type,
        lifecycle: 'production',
        owner: entry.service.owner,
        system: entry.service.team,
        dependsOn: entry.service.dependencies?.map(d => `component:${d}`),
        providesApis: entry.service.apis?.map(a => `api:${a}`),
      },
    };
  }

  fromBackstageEntity(entity: BackstageEntity): ServiceDefinition {
    return {
      name: entity.metadata.name,
      type: (entity.spec.type as ServiceDefinition['type']) ?? 'library',
      owner: entity.spec.owner,
      team: entity.spec.system,
      repository: entity.metadata.annotations?.['ideia.dev/repository'] ?? '',
      language: entity.metadata.annotations?.['ideia.dev/language'] ?? 'unknown',
      dependencies: entity.spec.dependsOn?.map(d => d.replace('component:', '')) ?? [],
      apis: entity.spec.providesApis?.map(a => a.replace('api:', '')) ?? [],
      tags: entity.metadata.tags,
      metadata: entity.metadata.annotations,
      createdAt: Number(entity.metadata.annotations?.['ideia.dev/created-at'] ?? Date.now()),
      updatedAt: Date.now(),
    };
  }

  async syncToBackstage(entries?: CatalogEntry[]): Promise<number> {
    const targetEntries = entries ?? this._catalog.list();
    const entities = targetEntries.map(e => this.toBackstageEntity(e));
    let synced = 0;
    for (const entity of entities) {
      try {
        await this._postEntity(entity);
        synced++;
      } catch {
        // skip failed syncs
      }
    }
    return synced;
  }

  async syncFromBackstage(entities: BackstageEntity[]): Promise<number> {
    let count = 0;
    for (const entity of entities) {
      try {
        const def = this.fromBackstageEntity(entity);
        await this._catalog.register(def);
        count++;
      } catch {
        // skip invalid entities
      }
    }
    return count;
  }

  async getAllBackstageEntities(): Promise<BackstageEntity[]> {
    return this._catalog.list().map(e => this.toBackstageEntity(e));
  }

  async getBackstageEntity(name: string): Promise<BackstageEntity | undefined> {
    const entry = this._catalog.get(name);
    return entry ? this.toBackstageEntity(entry) : undefined;
  }

  private async _postEntity(_entity: BackstageEntity): Promise<void> {
    return;
  }
}
