import { randomUUID } from 'crypto';
import type { IEventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
import {
  BHPMessage,
  BHPMessageType,
  BHPPlatform,
  BHPConfig,
  BHPMessageHandler,
} from './types';

const log = createLogger('bhp:protocol');

export class BHPProtocol {
  private eventBus: IEventBus;
  private auditTrail?: AuditTrail;
  private config: BHPConfig;
  private handlers: BHPMessageHandler = {};
  private cleanupFunctions: (() => void)[] = [];
  private messageCount = 0;

  constructor(eventBus: IEventBus, config: BHPConfig, auditTrail?: AuditTrail) {
    this.eventBus = eventBus;
    this.config = config;
    this.auditTrail = auditTrail;
  }

  async start(): Promise<void> {
    const types: BHPMessageType[] = [
      'HELP!', 'STATS', 'PLAN', 'APPROVE', 'REJECT', 'CLARIFY', 'ADAPT',
      'help_request', 'help_offer', 'clarification', 'confirmation', 'error_report',
    ];

    for (const type of types) {
      const eventType = `bhp.${type.toLowerCase().replace('!', '')}`;
      const subId = await this.eventBus.subscribe(eventType, (event: any) => {
        const msg = event.payload?.message as BHPMessage | undefined;
        if (msg) {
          this.handleMessage(msg);
        }
      });
      this.cleanupFunctions.push(() => { this.eventBus.unsubscribe(subId); });
    }

    log.info('BHPProtocol started');
  }

  setHandler(handler: BHPMessageHandler): void {
    this.handlers = handler;
  }

  send(type: BHPMessageType, source: BHPPlatform, target: BHPPlatform, payload: Record<string, unknown>): string {
    const msg: BHPMessage = {
      id: randomUUID(),
      type,
      source,
      target,
      timestamp: new Date().toISOString(),
      payload,
      ttl: this.config.timeout,
    };

    const eventType = `bhp.${type.toLowerCase().replace('!', '')}`;
    this.eventBus.emit({
      type: eventType,
      source: 'bhp-protocol',
      payload: { message: msg },
      metadata: { bhpVersion: '1.0' },
    });

    this.messageCount++;
    log.info(`Message sent: ${type} -> ${target}`);
    return msg.id;
  }

  sendHelpRequest(source: BHPPlatform, target: BHPPlatform, context: string): string {
    return this.send('help_request', source, target, { context });
  }

  sendHelpOffer(source: BHPPlatform, target: BHPPlatform, capability: string): string {
    return this.send('help_offer', source, target, { capability });
  }

  sendClarification(source: BHPPlatform, target: BHPPlatform, planId: string, questions: string[]): string {
    return this.send('clarification', source, target, { planId, questions });
  }

  sendConfirmation(source: BHPPlatform, target: BHPPlatform, planId: string, approved: boolean): string {
    return this.send('confirmation', source, target, { planId, approved });
  }

  sendErrorReport(source: BHPPlatform, target: BHPPlatform, error: string, details?: string): string {
    return this.send('error_report', source, target, { error, details });
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  dispose(): void {
    for (const cleanup of this.cleanupFunctions) {
      cleanup();
    }
    this.cleanupFunctions = [];
    log.info('BHPProtocol disposed');
  }

  private handleMessage(msg: BHPMessage): void {
    const handlerMap: Record<string, keyof BHPMessageHandler> = {
      'HELP!': 'onHelp',
      'STATS': 'onStats',
      'PLAN': 'onPlan',
      'APPROVE': 'onApprove',
      'REJECT': 'onReject',
      'CLARIFY': 'onClarify',
      'ADAPT': 'onAdapt',
      'help_request': 'onHelpRequest',
      'help_offer': 'onHelpOffer',
      'clarification': 'onClarification',
      'confirmation': 'onConfirmation',
      'error_report': 'onErrorReport',
    };

    const handlerKey = handlerMap[msg.type];
    const handler = handlerKey ? this.handlers[handlerKey] : undefined;

    if (handler) {
      handler(msg);
    }

    this.auditTrail?.append({
      actor: msg.source === 'human' ? 'user' : msg.source === 'ia' ? 'ai' : 'system',
      eventType: `bhp.${msg.type}`,
      target: msg.target,
      decision: msg.type === 'confirmation' ? 'approved' : 'auto',
      result: 'success',
      metadata: { messageId: msg.id },
    });

    this.messageCount++;
  }
}
