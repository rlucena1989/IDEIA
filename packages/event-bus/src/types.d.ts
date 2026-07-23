import type { WsEventType as ContractWsEventType, WsClientEvent, WsServerEvent, WsBroadcastEvent } from '@ideia/contracts';
export type { WsClientEvent, WsServerEvent, WsBroadcastEvent };
export type EventType = ContractWsEventType | 'policy.evaluated' | 'policy.violated' | 'cycle.completed' | 'feedback.submitted' | 'task.created' | 'trace.linked' | 'workflow.completed' | 'agent.action' | 'session:created' | 'control.emergency.stop' | 'control.emergency.pause' | 'control.emergency.rollback' | 'control.autonomy.changed' | 'control.contract.broken' | 'control.loop.detected' | 'control.profile.updated' | 'control.bhp.help.requested' | 'control.bhp.plan.submitted' | 'control.bhp.decision' | 'self.panel.opened' | 'self.panel.closed' | 'self.scan.started' | 'self.scan.complete' | 'self.fix.proposed' | 'self.fix.applied' | 'self.fix.failed' | 'self.fix.rolledback' | 'self.tech.discovered' | 'self.tech.recommended' | 'self.adr.generated' | 'self.chat.message' | 'self.config.changed' | 'self.cycle.completed' | 'config.changed' | 'config.profile.applied' | 'config.context.switched' | 'config.version.saved' | 'config.version.rolledback' | 'notification.sent' | 'notification.channel.configured' | 'safety.allow' | 'safety.pause' | 'safety.stop' | 'safety.rollback' | 'safety.degraded' | 'safety.emergency-stop' | 'safety.effect' | 'safety.recovery' | 'scope.violation.detected' | 'scope.access.blocked' | 'scope.access.allowed';
export interface EventPayload {
    task?: Record<string, unknown>;
    agent?: Record<string, unknown>;
    requirement?: Record<string, unknown>;
    trace?: Record<string, unknown>;
    feedback?: Record<string, unknown>;
    policy?: Record<string, unknown>;
    code?: Record<string, unknown>;
    cycle?: Record<string, unknown>;
    alert?: Record<string, unknown>;
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
//# sourceMappingURL=types.d.ts.map