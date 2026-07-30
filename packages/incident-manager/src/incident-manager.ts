import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import {
  IncidentSeverity,
  IncidentStatus,
  type Incident,
  type TimelineEntry,
  type PostMortem,
  type ActionItem,
} from './types';
import { IncidentNotifier } from './incident-notifier';
const logger = createLogger('incident-manager');

const SLA_HOURS: Record<IncidentSeverity, number> = {
  [IncidentSeverity.critical]: 1,
  [IncidentSeverity.high]: 4,
  [IncidentSeverity.medium]: 24,
  [IncidentSeverity.low]: 72,
};

export class IncidentManager {
  private incidents: Map<string, Incident> = new Map();
  private postMortems: Map<string, PostMortem> = new Map();
  private notifier?: IncidentNotifier;

  constructor(notifier?: IncidentNotifier) {
    this.notifier = notifier;
  }

  create(params: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    assignee?: string;
    tags?: string[];
  }): Incident {
    const id = uuidv4();
    const now = new Date();
    const sla = new Date(now.getTime() + SLA_HOURS[params.severity] * 60 * 60 * 1000);

    const incident: Incident = {
      id,
      title: params.title,
      description: params.description,
      severity: params.severity,
      status: IncidentStatus.detected,
      detectedAt: now,
      sla,
      assignee: params.assignee,
      tags: params.tags ?? [],
      notes: [
        {
          timestamp: now,
          type: 'status_change',
          message: `Incident detected with severity ${params.severity}`,
        },
      ],
    };

    this.incidents.set(id, incident);
    this.notifier?.notifyCreated(incident).catch(() => {});
    return incident;
  }

  updateStatus(id: string, status: IncidentStatus, message?: string): Incident | undefined {
    const incident = this.incidents.get(id);
    if (!incident) return undefined;

    const oldStatus = incident.status;
    incident.status = status;

    if (status === IncidentStatus.resolved) {
      incident.resolvedAt = new Date();
    }

    incident.notes.push({
      timestamp: new Date(),
      type: 'status_change',
      message: message ?? `Status changed to ${status}`,
    });

    this.notifier?.notifyStatusChanged(incident, oldStatus).catch(() => {});
    return incident;
  }

  assign(id: string, assignee: string): Incident | undefined {
    const incident = this.incidents.get(id);
    if (!incident) return undefined;

    incident.assignee = assignee;
    incident.notes.push({
      timestamp: new Date(),
      type: 'assignment',
      message: `Assigned to ${assignee}`,
    });

    return incident;
  }

  addNote(id: string, message: string, author?: string): Incident | undefined {
    const incident = this.incidents.get(id);
    if (!incident) return undefined;

    incident.notes.push({
      timestamp: new Date(),
      type: 'note',
      message,
      author,
    });

    return incident;
  }

  resolve(id: string, message?: string): Incident | undefined {
    const incident = this.incidents.get(id);
    if (!incident) return undefined;

    incident.status = IncidentStatus.resolved;
    incident.resolvedAt = new Date();

    incident.notes.push({
      timestamp: new Date(),
      type: 'resolution',
      message: message ?? 'Incident resolved',
    });

    return incident;
  }

  getTimeline(id: string): TimelineEntry[] | undefined {
    const incident = this.incidents.get(id);
    return incident ? incident.notes : undefined;
  }

  list(filters?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    assignee?: string;
  }): Incident[] {
    let result = Array.from(this.incidents.values());

    if (filters) {
      if (filters.status) {
        result = result.filter(i => i.status === filters.status);
      }
      if (filters.severity) {
        result = result.filter(i => i.severity === filters.severity);
      }
      if (filters.assignee) {
        result = result.filter(i => i.assignee === filters.assignee);
      }
    }

    return result.sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()
    );
  }

  createPostMortem(params: {
    incidentId: string;
    rootCause: string;
    impact: string;
    lessons: string;
  }): PostMortem | undefined {
    const incident = this.incidents.get(params.incidentId);
    if (!incident) return undefined;

    const postMortem: PostMortem = {
      incidentId: params.incidentId,
      rootCause: params.rootCause,
      impact: params.impact,
      lessons: params.lessons,
      actionItems: [],
    };

    this.postMortems.set(params.incidentId, postMortem);
    incident.status = IncidentStatus.post_mortem;

    return postMortem;
  }

  addActionItem(
    incidentId: string,
    description: string,
    owner: string
  ): ActionItem | undefined {
    const pm = this.postMortems.get(incidentId);
    if (!pm) return undefined;

    const item: ActionItem = {
      id: uuidv4(),
      description,
      owner,
      completed: false,
      createdAt: new Date(),
    };

    pm.actionItems.push(item);
    return item;
  }

  completeActionItem(incidentId: string, actionItemId: string): boolean {
    const pm = this.postMortems.get(incidentId);
    if (!pm) return false;

    const item = pm.actionItems.find(a => a.id === actionItemId);
    if (!item) return false;

    item.completed = true;
    item.completedAt = new Date();
    return true;
  }

  getPostMortem(incidentId: string): PostMortem | undefined {
    return this.postMortems.get(incidentId);
  }

  getSlaHours(severity: IncidentSeverity): number {
    return SLA_HOURS[severity];
  }
}
