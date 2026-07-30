export interface IdeApiClientOptions {
  baseUrl?: string;
}

export class IdeApiClient {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();

  constructor(options: IdeApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://127.0.0.1:3001';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ide/status`);
      return res.ok;
    } catch { return false; }
  }

  async getFileContent(path: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/files/read`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error(`Failed to read file: ${res.statusText}`);
    const data = await res.json();
    return data.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/files/write`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    if (!res.ok) throw new Error(`Failed to write file: ${res.statusText}`);
  }

  async listDirectory(path: string): Promise<Array<{ name: string; path: string; type: 'file' | 'directory' }>> {
    const res = await fetch(`${this.baseUrl}/api/files/list`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error(`Failed to list directory: ${res.statusText}`);
    const data = await res.json();
    return data.entries ?? [];
  }

  async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`Chat completion failed: ${res.statusText}`);
    const data = await res.json();
    return data.content ?? '';
  }

  connectWebSocket(): void {
    const wsUrl = this.baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    this.ws = new WebSocket(`${wsUrl}/ws`);
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const handler = this.messageHandlers.get(msg.type);
        if (handler) handler(msg.payload);
      } catch { /* skip invalid messages */ }
    };
  }

  onMessage(type: string, handler: (data: unknown) => void): void {
    this.messageHandlers.set(type, handler);
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
