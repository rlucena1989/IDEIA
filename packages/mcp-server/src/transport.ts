import { McpRequest, McpResponse, McpTransport } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('transport');

export class InMemoryTransport implements McpTransport {
  private onMsg: ((msg: McpRequest) => Promise<void> | void) | null = null;
  private sent: McpResponse[] = [];
  private isClosed = false;

  send(response: McpResponse): void {
    if (!this.isClosed) {
      this.sent.push(response);
    }
  }

  onMessage(handler: (msg: McpRequest) => Promise<void> | void): void {
    this.onMsg = handler;
  }

  async receive(request: McpRequest): Promise<void> {
    if (this.onMsg && !this.isClosed) {
      await this.onMsg(request);
    }
  }

  getSent(): McpResponse[] {
    return [...this.sent];
  }

  clearSent(): void {
    this.sent = [];
  }

  close(): void {
    this.isClosed = true;
    this.onMsg = null;
  }

  get closed(): boolean {
    return this.isClosed;
  }
}

export function createInMemoryTransport(): InMemoryTransport {
  return new InMemoryTransport();
}
