import { Emitter} from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('event-bridge-service');

export interface BridgeEvent {
  type: string;
  data: unknown;
  timestamp: string;
  source?: string;
}

export interface EventSubscription {
  eventType: string;
  callback: (event: BridgeEvent) => void;
  unsubscribe: () => void;
}

export class EventBridgeService {
  private emitters: Map<string, Emitter<BridgeEvent>> = new Map();
  private eventHistory: BridgeEvent[] = [];
  private maxHistorySize = 1000;
  private onBridgeEventEmitter = new Emitter<BridgeEvent>();

  get onBridgeEvent() {
    return this.onBridgeEventEmitter.event;
  }

  publish(eventType: string, data: unknown, source?: string): void {
    const event: BridgeEvent = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      source,
    };

    this.addToHistory(event);
    this.onBridgeEventEmitter.fire(event);

    let emitter = this.emitters.get(eventType);
    if (!emitter) {
      emitter = new Emitter<BridgeEvent>();
      this.emitters.set(eventType, emitter);
    }
    emitter.fire(event);
  }

  subscribe(eventType: string, callback: (event: BridgeEvent) => void): EventSubscription {
    let emitter = this.emitters.get(eventType);
    if (!emitter) {
      emitter = new Emitter<BridgeEvent>();
      this.emitters.set(eventType, emitter);
    }

    const disposable = emitter.event(callback);
    
    return {
      eventType,
      callback,
      unsubscribe: () => disposable.dispose(),
    };
  }

  unsubscribe(subscription: EventSubscription): void {
    const emitter = this.emitters.get(subscription.eventType);
    if (emitter) {
      emitter.event(subscription.callback).dispose();
    }
  }

  getHistory(eventType?: string, limit?: number): BridgeEvent[] {
    let history = this.eventHistory;
    
    if (eventType) {
      history = history.filter(e => e.type === eventType);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  getSubscribedEventTypes(): string[] {
    return Array.from(this.emitters.keys());
  }

  private addToHistory(event: BridgeEvent): void {
    this.eventHistory.push(event);
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    
    while (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
}

export function createEventBridgeService(): EventBridgeService {
  return new EventBridgeService();
}
