import type { WsEventType as ContractWsEventType, WsClientEvent, WsServerEvent, WsBroadcastEvent } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';

export type { WsClientEvent, WsServerEvent, WsBroadcastEvent };

export type EventType =
  | ContractWsEventType
  | 'policy.evaluated'
  | 'policy.violated'
  | 'cycle.completed'
  | 'feedback.submitted'
  | 'task.created'
  | 'trace.linked'
  | 'workflow.completed'
  | 'agent.action'
  | 'session:created'
  // S24 Control events
  | 'control.emergency.stop'
  | 'control.emergency.pause'
  | 'control.emergency.rollback'
  | 'control.autonomy.changed'
  | 'control.contract.broken'
  | 'control.loop.detected'
  | 'control.profile.updated'
  | 'control.bhp.help.requested'
  | 'control.bhp.plan.submitted'
  | 'control.bhp.decision'
  // S23 Self events
  | 'self.panel.opened'
  | 'self.panel.closed'
  | 'self.scan.started'
  | 'self.scan.complete'
  | 'self.fix.proposed'
  | 'self.fix.applied'
  | 'self.fix.failed'
  | 'self.fix.rolledback'
  | 'self.tech.discovered'
  | 'self.tech.recommended'
  | 'self.adr.generated'
  | 'self.chat.message'
  | 'self.config.changed'
  | 'self.cycle.completed'
  // S25 Config events
  | 'config.changed'
  | 'config.profile.applied'
  | 'config.context.switched'
  | 'config.version.saved'
  | 'config.version.rolledback'
  // UX events
  | 'notification.sent'
  | 'notification.channel.configured'
  // Safety events
  | 'safety.allow'
  | 'safety.pause'
  | 'safety.stop'
  | 'safety.rollback'
  | 'safety.degraded'
  | 'safety.emergency-stop'
  | 'safety.effect'
  | 'safety.recovery'
  // Scope isolation events
  | 'scope.violation.detected'
  | 'scope.access.blocked'
  | 'scope.access.allowed'
  // S24 Control & Tuning events
  | 'control.breaker.tripped'
  | 'control.breaker.reset'
  | 'control.breaker.evaluated'
  | 'control.safety.evaluate'
  | 'control.safety.report'
  | 'control.safety.layer-status'
  | 'control.continuity.paused'
  | 'control.continuity.resumed'
  | 'control.continuity.escalated'
  | 'control.continuity.decision'
  | 'control.bhp.message'
  | 'control.bhp.consensus'
  | 'control.bhp.evaluation'
  | 'control.bhp.escalated'
  | 'control.profile.usability-update'
  | 'control.profile.usability-adapt'
  | 'control.chaos.test-started'
  | 'control.chaos.test-completed'
  | 'control.chaos.test-failed';

export interface EventPayload {
  approved?: boolean;
  message?: Record<string, unknown>;
  task?: Record<string, unknown>;
  agent?: Record<string, unknown>;
  requirement?: Record<string, unknown>;
  trace?: Record<string, unknown>;
  feedback?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  code?: Record<string, unknown>;
  cycle?: Record<string, unknown>;
  alert?: Record<string, unknown>;
  // Control events payload
  control?: Record<string, unknown>;
  safety?: Record<string, unknown>;
  scope?: Record<string, unknown>;
  self?: Record<string, unknown>;
  config?: Record<string, unknown>;
  notification?: Record<string, unknown>;
  bhp?: Record<string, unknown>;
  decision?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  radar?: Record<string, unknown>;
  adr?: Record<string, unknown>;
  evolution?: Record<string, unknown>;
  metric?: Record<string, unknown>;
  slo?: Record<string, unknown>;
  breaker?: Record<string, unknown>;
  continuity?: Record<string, unknown>;
  chaos?: Record<string, unknown>;
  usability?: Record<string, unknown>;
}

export interface BusEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  payload?: EventPayload;
  metadata?: Record<string, unknown>;
}

export type EventHandler = (event: BusEvent) => void | Promise<void>;

export interface Subscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  once?: boolean;
}

export type EventEmitInput = {
  type: string;
  source: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export interface IEventBus {
  subscribe(eventType: string, handler: EventHandler, once?: boolean): Promise<string>;
  subscribeOnce(eventType: EventType | '*', handler: EventHandler): Promise<string>;
  unsubscribe(id: string): Promise<boolean>;
  emit(event: EventEmitInput): Promise<BusEvent>;
  getHistory(eventType?: string): Promise<BusEvent[]>;
  clearHistory(): Promise<void>;
  subscriberCount(): Promise<number>;
}
