import { EventEmitter } from 'events';
import { SidecarIPC, IPCRequest, IPCResponse } from '../ipc-protocol';
import { TauriSidecar } from '../sidecar';
import { HealthCheck } from '../health-check';

class TestStream extends EventEmitter {
  public writtenData: string[] = [];
  public readable = true;
  public writable = true;

  write(data: string | Buffer): boolean {
    this.writtenData.push(data.toString());
    return true;
  }

  push(data: string | Buffer): void {
    this.emit('data', Buffer.from(data));
  }

  end(): void {
    this.emit('end');
  }

  setEncoding(_encoding: string): this {
    return this;
  }

  resume(): this {
    return this;
  }

  pause(): this {
    return this;
  }

  destroy(_error?: Error): void {
    this.emit('close');
  }

  read(_size?: number): Buffer | null {
    return null;
  }

  pipe<T extends NodeJS.WritableStream>(_destination: T, _options?: { end?: boolean }): T {
    return _destination;
  }

  unpipe(_destination?: NodeJS.WritableStream): this {
    return this;
  }

  unshift(_chunk: string | Buffer): void {}
}

function createIPCStreams(): { stdin: TestStream; stdout: TestStream; stderr: TestStream } {
  return {
    stdin: new TestStream(),
    stdout: new TestStream(),
    stderr: new TestStream(),
  };
}

describe('SidecarIPC', () => {
  let streams: { stdin: TestStream; stdout: TestStream; stderr: TestStream };
  let ipc: SidecarIPC;

  beforeEach(() => {
    streams = createIPCStreams();
    ipc = new SidecarIPC(
      streams.stdin as unknown as NodeJS.ReadableStream,
      streams.stdout as unknown as NodeJS.WritableStream,
      streams.stderr as unknown as NodeJS.WritableStream
    );
  });

  afterEach(() => {
    if (ipc.isConnected) {
      ipc.disconnect();
    }
  });

  it('should start disconnected', () => {
    expect(ipc.isConnected).toBe(false);
  });

  it('should connect and disconnect', () => {
    ipc.connect();
    expect(ipc.isConnected).toBe(true);
    ipc.disconnect();
    expect(ipc.isConnected).toBe(false);
  });

  it('should be idempotent on connect', () => {
    ipc.connect();
    ipc.connect();
    expect(ipc.isConnected).toBe(true);
    ipc.disconnect();
  });

  it('should be idempotent on disconnect', () => {
    ipc.disconnect();
    expect(ipc.isConnected).toBe(false);
  });

  it('should send and receive a response', async () => {
    ipc.connect();

    const sendPromise = ipc.send({
      id: 'req-1',
      method: 'echo',
      params: { text: 'hello' },
      timestamp: Date.now(),
    });

    const response: IPCResponse = {
      id: 'req-1',
      method: 'echo',
      params: {},
      timestamp: Date.now(),
      result: { text: 'hello' },
    };

    streams.stdin.push(`${JSON.stringify(response)}\n`);

    const result = await sendPromise;
    expect(result.result).toEqual({ text: 'hello' });
  });

  it('should reject malformed JSON and log to stderr', () => {
    const stderrSpy = jest.spyOn(streams.stderr, 'write');
    ipc.connect();

    streams.stdin.push('not valid json\n');

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Malformed JSON'));
    stderrSpy.mockRestore();
  });

  it('should reject send when not connected', async () => {
    const request: IPCRequest = {
      id: 'fail-1',
      method: 'test',
      params: {},
      timestamp: Date.now(),
    };

    await expect(ipc.send(request)).rejects.toThrow('IPC is not connected');
  });

  it('should reject pending requests on disconnect', async () => {
    ipc.connect();

    const sendPromise = ipc.send({
      id: 'lost-1',
      method: 'never_responds',
      params: {},
      timestamp: Date.now(),
    });

    ipc.disconnect();

    await expect(sendPromise).rejects.toThrow('IPC disconnected');
  });

  it('should call onMessage callback for all messages', () => {
    const messages: IPCResponse[] = [];
    ipc.connect();
    ipc.onMessage((msg: IPCResponse) => { messages.push(msg); });

    const msg1: IPCResponse = { id: 'm1', method: 'event', params: {}, timestamp: 1, result: 'a' };
    const msg2: IPCResponse = { id: 'm2', method: 'event', params: {}, timestamp: 2, result: 'b' };

    streams.stdin.push(`${JSON.stringify(msg1)}\n`);
    streams.stdin.push(`${JSON.stringify(msg2)}\n`);

    expect(messages).toHaveLength(2);
    expect(messages[0].result).toBe('a');
    expect(messages[1].result).toBe('b');
  });

  it('should handle concurrent requests', async () => {
    ipc.connect();

    const promise1 = ipc.send({ id: 'c1', method: 'm1', params: {}, timestamp: 1 });
    const promise2 = ipc.send({ id: 'c2', method: 'm2', params: {}, timestamp: 2 });

    streams.stdin.push(`${JSON.stringify({ id: 'c2', method: 'm2', params: {}, timestamp: 3, result: 'second' })}\n`);
    streams.stdin.push(`${JSON.stringify({ id: 'c1', method: 'm1', params: {}, timestamp: 4, result: 'first' })}\n`);

    const result1 = await promise1;
    const result2 = await promise2;

    expect(result1.result).toBe('first');
    expect(result2.result).toBe('second');
  });
});

describe('HealthCheck', () => {
  let healthCheck: HealthCheck;

  beforeEach(() => {
    healthCheck = new HealthCheck();
    jest.useFakeTimers();
  });

  afterEach(() => {
    healthCheck.stop();
    jest.useRealTimers();
  });

  it('should report healthy after start', () => {
    healthCheck.start(15000);
    const status = healthCheck.getStatus();
    expect(status.status).toBe('healthy');
    expect(status.restartCount).toBe(0);
  });

  it('should report degraded after missing heartbeat', () => {
    healthCheck.start(15000);
    jest.advanceTimersByTime(35000);

    const status = healthCheck.getStatus();
    expect(status.status).toBe('degraded');
  });

  it('should report down after long missing heartbeat', () => {
    healthCheck.start(15000);
    jest.advanceTimersByTime(65000);

    const status = healthCheck.getStatus();
    expect(status.status).toBe('down');
  });

  it('should recover after recordHeartbeat', () => {
    healthCheck.start(15000);
    jest.advanceTimersByTime(35000);
    expect(healthCheck.getStatus().status).toBe('degraded');

    healthCheck.recordHeartbeat();
    expect(healthCheck.getStatus().status).toBe('healthy');
  });

  it('should track restart count', () => {
    healthCheck.start(15000);
    expect(healthCheck.restartCount).toBe(0);

    healthCheck.incrementRestartCount();
    expect(healthCheck.restartCount).toBe(1);

    healthCheck.incrementRestartCount();
    expect(healthCheck.restartCount).toBe(2);
  });

  it('should report uptime correctly', () => {
    healthCheck.start(15000);

    jest.advanceTimersByTime(5000);
    expect(healthCheck.getStatus().uptime).toBe(5000);
  });
});

describe('TauriSidecar', () => {
  let streams: { stdin: TestStream; stdout: TestStream; stderr: TestStream };
  let sidecar: TauriSidecar;

  beforeEach(() => {
    streams = createIPCStreams();
    sidecar = new TauriSidecar(
      { startupTimeout: 5000, maxRestarts: 2, heartbeatInterval: 15000 },
      {
        stdin: streams.stdin as unknown as NodeJS.ReadableStream,
        stdout: streams.stdout as unknown as NodeJS.WritableStream,
        stderr: streams.stderr as unknown as NodeJS.WritableStream,
      }
    );
  });

  afterEach(async () => {
    if (sidecar.isRunning()) {
      await sidecar.stop();
    }
  });

  it('should start and stop', async () => {
    expect(sidecar.isRunning()).toBe(false);

    await sidecar.start();
    expect(sidecar.isRunning()).toBe(true);

    await sidecar.stop();
    expect(sidecar.isRunning()).toBe(false);
  });

  it('should invoke method and return result', async () => {
    await sidecar.start();

    const invokePromise = sidecar.invoke('ping', { value: 42 });

    const sentJson = JSON.parse(streams.stdout.writtenData[streams.stdout.writtenData.length - 1]) as IPCRequest;
    const response: IPCResponse = {
      id: sentJson.id,
      method: 'ping',
      params: {},
      timestamp: Date.now(),
      result: { value: 43 },
    };
    streams.stdin.push(`${JSON.stringify(response)}\n`);

    const result = await invokePromise;
    expect(result).toEqual({ value: 43 });
    expect(sentJson.method).toBe('ping');
    expect(sentJson.params).toEqual({ value: 42 });
  });

  it('should throw on invoke error response', async () => {
    await sidecar.start();

    const invokePromise = sidecar.invoke('fail');

    const sentJson = JSON.parse(streams.stdout.writtenData[streams.stdout.writtenData.length - 1]) as IPCRequest;
    const response: IPCResponse = {
      id: sentJson.id,
      method: 'fail',
      params: {},
      timestamp: Date.now(),
      error: { code: -1, message: 'Something went wrong' },
    };
    streams.stdin.push(`${JSON.stringify(response)}\n`);

    await expect(invokePromise).rejects.toThrow('Something went wrong');
  });

  it('should handle heartbeat messages', async () => {
    await sidecar.start();

    const hb: IPCResponse = {
      id: 'hb-1',
      method: 'heartbeat',
      params: {},
      timestamp: Date.now(),
      result: 'ok',
    };
    streams.stdin.push(`${JSON.stringify(hb)}\n`);

    const status = sidecar.getStatus();
    expect(status.status).toBe('healthy');
  });

  it('should restart and recover', async () => {
    await sidecar.start();

    const restartSpy = jest.fn();
    sidecar.on('restarting', restartSpy);

    await sidecar.restart();

    expect(restartSpy).toHaveBeenCalledTimes(1);
    expect(sidecar.isRunning()).toBe(true);
    expect(sidecar.getStatus().restartCount).toBe(1);
  });

  it('should throw when maxRestarts exceeded', async () => {
    await sidecar.start();

    await sidecar.restart();
    await sidecar.restart();

    await expect(sidecar.restart()).rejects.toThrow('Max restarts (2) exceeded');
  });

  it('should return status', async () => {
    await sidecar.start();

    const status = sidecar.getStatus();
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('uptime');
    expect(status).toHaveProperty('lastHeartbeat');
    expect(status).toHaveProperty('restartCount');
    expect(status).toHaveProperty('memoryUsage');
  });
});
