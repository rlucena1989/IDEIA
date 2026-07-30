export class DoubleWriteStrategy {
  constructor(
    private _publishFn: (subject: string, data: Uint8Array, opts?: { headers?: Record<string, string> }) => Promise<void>,
    private _streamName: string
  ) {}

  async publishV1(event: Record<string, unknown>): Promise<void> {
    await this._publishFn(
      `${this._streamName}.${event.aggregateId as string}`,
      new TextEncoder().encode(JSON.stringify(event)),
      { headers: { 'schema-version': '1' } }
    );
  }

  async publishV2(event: Record<string, unknown>): Promise<void> {
    const v2Event = { ...event, __schema: 'v2', migratedAt: Date.now() };
    await this._publishFn(
      `${this._streamName}.v2`,
      new TextEncoder().encode(JSON.stringify(v2Event)),
      { headers: { 'schema-version': '2' } }
    );
  }

  async publishBoth(event: Record<string, unknown>): Promise<void> {
    await Promise.all([
      this.publishV1(event),
      this.publishV2(event),
    ]);
  }
}
