export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  lastHeartbeat: number;
  restartCount: number;
  memoryUsage: number;
}

export class HealthCheck {
  private startTime = 0;
  private _lastHeartbeat = 0;
  private _restartCount = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  get restartCount(): number {
    return this._restartCount;
  }

  start(intervalMs: number): void {
    this.startTime = Date.now();
    this._lastHeartbeat = Date.now();
    this.intervalId = setInterval(() => {
      void 0;
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStatus(): HealthStatus {
    const now = Date.now();
    const elapsed = now - this._lastHeartbeat;
    let status: 'healthy' | 'degraded' | 'down';
    if (elapsed < 30000) {
      status = 'healthy';
    } else if (elapsed < 60000) {
      status = 'degraded';
    } else {
      status = 'down';
    }
    return {
      status,
      uptime: this.startTime > 0 ? now - this.startTime : 0,
      lastHeartbeat: this._lastHeartbeat,
      restartCount: this._restartCount,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  recordHeartbeat(): void {
    this._lastHeartbeat = Date.now();
  }

  incrementRestartCount(): void {
    this._restartCount++;
  }
}
