import { IKvStore, IMessageBus } from './command-bus';
import { createLogger } from '@ideia/logger';
const logger = createLogger('projection-builder');

export type Projector = (event: Record<string, unknown>) => Promise<Record<string, unknown>>;

export class ProjectionBuilder {
  constructor(private bus: IMessageBus, private kv: IKvStore) {}

  async buildProjection(_projectionName: string, _eventType: string, _projector: Projector): Promise<void> {
    // Em produção: consumir eventos do subject evt.{eventType} via IMessageBus
    // Aplicar projector em cada evento e salvar em KV
  }

  async rebuildProjection(projectionName: string): Promise<void> {
    await this.kv.put(`_meta:rebuild:${projectionName}`, new TextEncoder().encode(Date.now().toString()));
  }

  async getProjectionState(projectionName: string, aggregateId: string): Promise<Record<string, unknown> | null> {
    const entry = await this.kv.get(`proj:${projectionName}:${aggregateId}`);
    return entry ? JSON.parse(new TextDecoder().decode(entry.value)) : null;
  }
}
