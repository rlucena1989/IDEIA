import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { OutputChannel, OutputChannelManager } from './types';

class DefaultOutputChannel implements OutputChannel {
  readonly id: string;
  readonly label: string;
  private buffer: string[] = [];
  private visible = false;
  private onAppendedEmitter = new Emitter<string>();
  private onClearedEmitter = new Emitter<void>();

  get onAppended() { return this.onAppendedEmitter.event; }
  get onCleared() { return this.onClearedEmitter.event; }

  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }

  append(value: string): void {
    this.buffer.push(value);
    this.onAppendedEmitter.fire(value);
  }

  appendLine(value: string): void {
    this.append(value + '\n');
  }

  replace(value: string): void {
    this.buffer = [value];
    this.onClearedEmitter.fire(void 0);
    this.onAppendedEmitter.fire(value);
  }

  clear(): void {
    this.buffer = [];
    this.onClearedEmitter.fire(void 0);
  }

  show(preserveFocus?: boolean): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  getContent(): string {
    return this.buffer.join('');
  }

  getLines(): string[] {
    return [...this.buffer];
  }

  dispose(): void {
    this.buffer = [];
    this.onAppendedEmitter.dispose();
    this.onClearedEmitter.dispose();
  }
}

export class DefaultOutputChannelManager implements OutputChannelManager {
  private channels = new Map<string, DefaultOutputChannel>();
  private activeChannelId?: string;

  createChannel(id: string, label: string): OutputChannel {
    const existing = this.channels.get(id);
    if (existing) return existing;

    const channel = new DefaultOutputChannel(id, label);
    this.channels.set(id, channel);
    if (!this.activeChannelId) {
      this.activeChannelId = id;
    }
    return channel;
  }

  getChannel(id: string): OutputChannel | undefined {
    return this.channels.get(id);
  }

  deleteChannel(id: string): void {
    const channel = this.channels.get(id);
    if (channel) {
      channel.dispose();
      this.channels.delete(id);
      if (this.activeChannelId === id) {
        this.activeChannelId = this.channels.keys().next().value;
      }
    }
  }

  getChannels(): OutputChannel[] {
    return Array.from(this.channels.values());
  }

  getActiveChannel(): OutputChannel | undefined {
    if (!this.activeChannelId) return undefined;
    return this.channels.get(this.activeChannelId);
  }

  setActiveChannel(id: string): void {
    if (this.channels.has(id)) {
      this.activeChannelId = id;
    }
  }
}
