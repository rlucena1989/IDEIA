import * as readline from 'readline';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ipc-protocol');

export interface IPCMessage {
  id: string;
  method: string;
  params: unknown;
  timestamp: number;
}

export interface IPCRequest extends IPCMessage {}

export interface IPCResponse extends IPCMessage {
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export class SidecarIPC {
  private pending = new Map<string, {
    resolve: (value: IPCResponse) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private rl: readline.Interface | null = null;
  private _isConnected = false;
  private messageCallback: ((msg: IPCResponse) => void) | null = null;

  constructor(
    private stdin: NodeJS.ReadableStream = process.stdin,
    private stdout: NodeJS.WritableStream = process.stdout,
    private stderr: NodeJS.WritableStream = process.stderr
  ) {}

  get isConnected(): boolean {
    return this._isConnected;
  }

  connect(): void {
    if (this._isConnected) return;
    this.rl = readline.createInterface({ input: this.stdin });
    this.rl.on('line', (line: string) => {
      let msg: IPCResponse;
      try {
        msg = JSON.parse(line) as IPCResponse;
      } catch {
        this.stderr.write(`Malformed JSON: ${line}\n`);
        return;
      }
      const pending = this.pending.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);
        pending.resolve(msg);
      }
      if (this.messageCallback) {
        this.messageCallback(msg);
      }
    });
    this._isConnected = true;
  }

  disconnect(): void {
    if (!this._isConnected) return;
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this._isConnected = false;
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('IPC disconnected'));
    }
    this.pending.clear();
  }

  async send(message: IPCRequest): Promise<IPCResponse> {
    if (!this._isConnected) {
      throw new Error('IPC is not connected');
    }
    return new Promise<IPCResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(message.id);
        reject(new Error(`IPC request timeout: ${message.method}`));
      }, 30000);
      this.pending.set(message.id, { resolve, reject, timer });
      this.stdout.write(`${JSON.stringify(message)}\n`);
    });
  }

  onMessage(callback: (msg: IPCResponse) => void): void {
    this.messageCallback = callback;
  }
}
