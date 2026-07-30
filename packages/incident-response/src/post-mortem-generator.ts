import { Logger, createLogger } from '@ideia/logger';
import type { Incident, PostMortem, PostMortemTimelineEntry, RootCause, ActionItem, PostMortemMetrics } from './types';

export class PostMortemGenerator {
  private readonly _logger: Logger;

  constructor(logger?: Logger) {
    this._logger = logger || createLogger('incident-response');
  }

  async generate(incident: Incident): Promise<PostMortem> {
    this._logger.info(`Generating post-mortem for incident ${incident.id}`);

    return {
      incidentId: incident.id,
      title: `Post-Mortem: ${incident.violationType} — ${incident.severity}`,
      date: new Date().toISOString(),
      severity: incident.severity,
      durationMs: (incident.resolvedAt || Date.now()) - incident.timestamp,
      summary: this._generateSummary(incident),
      timeline: this._buildTimeline(incident),
      rootCause: this._analyzeRootCause(incident),
      actionItems: this._generateActionItems(incident),
      lessonsLearned: this._generateLessonsLearned(incident),
      metrics: this._calculateMetrics(incident),
      blamelessStatement: 'This incident was caused by systemic factors, not individual error. Our focus is on improving processes and defenses.',
    };
  }

  private _generateSummary(incident: Incident): string {
    return `Incident ${incident.id}: ${incident.violationType} affecting agent ${incident.agentId}. ` +
      `Severity: ${incident.severity}. Type: ${incident.type}. ` +
      `Duration: ${((incident.resolvedAt || Date.now()) - incident.timestamp) / 1000}s. ` +
      `Actions executed: ${incident.actions.length}. ` +
      `SLA met: ${incident.slaStatus?.overallSlaMet ? 'Yes' : 'No'}.`;
  }

  private _buildTimeline(incident: Incident): PostMortemTimelineEntry[] {
    const timeline: PostMortemTimelineEntry[] = [
      {
        timestamp: incident.timestamp,
        event: 'Incident detected',
        actor: 'IncidentDetector',
        systemResponse: `Incident created with severity ${incident.severity}`,
      },
    ];

    for (const action of incident.actions) {
      timeline.push({
        timestamp: action.timestamp,
        event: `Executed: ${action.type}`,
        actor: 'PlaybookEngine',
        systemResponse: action.success ? 'Success' : `Failed: ${action.error || 'Unknown error'}`,
      });
    }

    if (incident.containedAt) {
      timeline.push({
        timestamp: incident.containedAt,
        event: 'Incident contained',
        actor: 'IncidentResponseOrchestrator',
        systemResponse: 'Containment measures applied',
      });
    }

    if (incident.resolvedAt) {
      timeline.push({
        timestamp: incident.resolvedAt,
        event: 'Incident resolved',
        actor: 'IncidentResponseOrchestrator',
        systemResponse: `Resolution time: ${(incident.resolvedAt - incident.timestamp) / 1000}s`,
      });
    }

    return timeline;
  }

  private _analyzeRootCause(incident: Incident): RootCause {
    let primaryCause: string;
    const contributingFactors: string[] = [];
    let detectionGap: string;
    let preventionMeasure: string;
    let confidence: number;

    switch (incident.type) {
      case 'malware':
        primaryCause = `Malicious file operations detected: ${incident.violationType}`;
        contributingFactors.push('Insufficient file system monitoring', 'Delayed signature update');
        detectionGap = 'Behavioral detection not configured for this file pattern';
        preventionMeasure = 'Implement file integrity monitoring and application whitelisting';
        confidence = 0.85;
        break;
      case 'intrusion':
        primaryCause = `Unauthorized access pattern: ${incident.violationType}`;
        contributingFactors.push('Weak access controls', 'Missing multi-factor authentication');
        detectionGap = 'Authentication anomaly detection not deployed';
        preventionMeasure = 'Enforce least privilege access and MFA for all agents';
        confidence = 0.9;
        break;
      case 'data_breach':
        primaryCause = `Data exfiltration detected: ${incident.violationType}`;
        contributingFactors.push('Missing data loss prevention controls', 'Unrestricted network egress');
        detectionGap = 'Data classification and monitoring not implemented';
        preventionMeasure = 'Deploy DLP controls and network segmentation';
        confidence = 0.88;
        break;
      case 'dos':
        primaryCause = `Denial of service: ${incident.violationType}`;
        contributingFactors.push('Missing rate limiting', 'Insufficient resource quotas');
        detectionGap = 'Anomaly-based rate detection not configured';
        preventionMeasure = 'Implement rate limiting and resource quotas';
        confidence = 0.82;
        break;
      case 'insider':
        primaryCause = `Insider threat detected: ${incident.violationType}`;
        contributingFactors.push('Missing user behavior analytics', 'Over-privileged access');
        detectionGap = 'UEBA not deployed';
        preventionMeasure = 'Implement user behavior analytics and just-in-time access';
        confidence = 0.78;
        break;
      default:
        primaryCause = incident.violationType;
        contributingFactors.push('Unknown contributing factors');
        detectionGap = 'None identified';
        preventionMeasure = 'Review and update detection rules';
        confidence = 0.7;
    }

    return {
      primaryCause,
      contributingFactors,
      detectionGap,
      preventionMeasure,
      confidence,
    };
  }

  private _generateActionItems(incident: Incident): ActionItem[] {
    const actionItems: ActionItem[] = [];

    switch (incident.type) {
      case 'malware':
        actionItems.push({
          id: `ai-${Date.now()}-1`,
          description: 'Deploy file integrity monitoring across all agent workspaces',
          owner: 'security-team',
          priority: 'P1',
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: 'open',
          verificationCriteria: 'File changes detected within 5 seconds',
        });
        break;
      case 'data_breach':
        actionItems.push({
          id: `ai-${Date.now()}-1`,
          description: 'Implement data classification and DLP controls',
          owner: 'security-team',
          priority: 'P1',
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          status: 'open',
          verificationCriteria: 'Sensitive data patterns flagged in outbound traffic',
        });
        actionItems.push({
          id: `ai-${Date.now()}-2`,
          description: 'Conduct GDPR breach notification assessment',
          owner: 'compliance-team',
          priority: 'P0',
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          status: 'open',
          verificationCriteria: 'Notification sent within 72h if required',
        });
        break;
      case 'intrusion':
        actionItems.push({
          id: `ai-${Date.now()}-1`,
          description: 'Audit and rotate all access credentials for affected agent',
          owner: 'security-team',
          priority: 'P1',
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          status: 'open',
          verificationCriteria: 'All credentials rotated and verified',
        });
        break;
      default:
        actionItems.push({
          id: `ai-${Date.now()}-1`,
          description: `Review and update detection rules for ${incident.type}`,
          owner: 'security-team',
          priority: 'P2',
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'open',
          verificationCriteria: 'Updated rules deployed and tested',
        });
    }

    actionItems.push({
      id: `ai-${Date.now()}-99`,
      description: 'Update incident response playbook based on lessons learned',
      owner: 'security-team',
      priority: 'P2',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: 'open',
      verificationCriteria: 'Playbook updated and reviewed',
    });

    return actionItems;
  }

  private _generateLessonsLearned(incident: Incident): string[] {
    const lessons: string[] = [];

    lessons.push(`Detection time for ${incident.severity} incidents needs improvement — current detection gap: ${incident.slaStatus?.detectSlaMet ? 'within SLA' : 'exceeded SLA'}`);

    if (incident.actions.some(a => !a.success)) {
      const failedCount = incident.actions.filter(a => !a.success).length;
      lessons.push(`${failedCount} of ${incident.actions.length} response actions failed — review playbook for ${incident.type}`);
    }

    if (incident.slaStatus && !incident.slaStatus.overallSlaMet) {
      lessons.push('SLA was breached — requires escalation path review and resource allocation');
    }

    if (incident.type === 'intrusion' || incident.type === 'data_breach') {
      lessons.push('Consider implementing predictive detection to catch similar patterns earlier');
    }

    lessons.push('Post-incident review completed — all findings documented for continuous improvement');

    return lessons;
  }

  private _calculateMetrics(incident: Incident): PostMortemMetrics {
    const resolveTime = (incident.resolvedAt || Date.now()) - incident.timestamp;
    const mtta = incident.actions.length > 0
      ? incident.actions[0].timestamp - incident.timestamp
      : resolveTime;
    const mttc = incident.containedAt
      ? incident.containedAt - incident.timestamp
      : resolveTime;

    return {
      mttd: incident.detectedAt - incident.timestamp,
      mtta,
      mttc,
      mttr: resolveTime,
      slaCompliance: incident.slaStatus?.overallSlaMet || false,
    };
  }
}
