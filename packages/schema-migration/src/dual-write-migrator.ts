export class DualWriteMigrator {
  private _phase: 'v1_only' | 'dual_write' | 'v2_primary' | 'v2_only' = 'v1_only';

  constructor(
    private _publishFn: (subject: string, data: Uint8Array, opts?: { headers?: Record<string, string> }) => Promise<void>,
    private _streamName: string
  ) {}

  async startDualWrite(): Promise<void> {
    this._phase = 'dual_write';
  }

  async publishV2(event: Record<string, unknown>): Promise<void> {
    if (this._phase === 'v1_only') return;
    const v2Event = { ...event, __schema: 'v2', migratedAt: Date.now() };
    await this._publishFn(`${this._streamName}.v2`, new TextEncoder().encode(JSON.stringify(v2Event)), {
      headers: { 'schema-version': '2', 'migration-phase': this._phase },
    });
  }

  async switchToV2(): Promise<void> {
    this._phase = 'v2_primary';
  }

  async completeMigration(): Promise<void> {
    this._phase = 'v2_only';
  }

  async backfillV2(events: Record<string, unknown>[]): Promise<void> {
    let count = 0;
    for (const event of events) {
      if (!event.__schema || (event.__schema as string) === 'v1') {
        await this.publishV2(event);
        count++;
      }
    }
  }

  async rollback(): Promise<void> {
    if (this._phase === 'v2_primary') {
      this._phase = 'dual_write';
    } else {
      this._phase = 'v1_only';
    }
  }

  getPhase(): string {
    return this._phase;
  }
}
