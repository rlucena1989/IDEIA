import { Logger, createLogger } from '@ideia/logger';
import type { Incident, IncidentSeverity, IncidentType, CampaignAlert, CorrelationRule, CorrelationCondition } from './types';

export class IncidentCorrelationEngine {
  private readonly _rules: Map<string, CorrelationRule> = new Map();
  private readonly _campaigns: Map<string, CampaignAlert> = new Map();
  private readonly _incidentWindow: Map<string, Incident[]> = new Map();
  private readonly _logger: Logger;

  constructor(logger?: Logger) {
    this._logger = logger || createLogger('incident-response');
    this._registerDefaultRules();
  }

  private _registerDefaultRules(): void {
    this.addRule({
      id: 'corr-multi-intrusion',
      name: 'Multi-Agent Intrusion Campaign',
      description: 'Correlates intrusion incidents across multiple agents within 1 hour',
      type: 'threshold',
      conditions: [
        { field: 'type', operator: 'eq', value: 'intrusion' },
        { field: 'severity', operator: 'in', value: ['P0', 'P1', 'P2'] },
      ],
      timeWindowMs: 3600000,
      threshold: 3,
      severity: 'P0',
      incidentType: 'intrusion',
      enabled: true,
    });

    this.addRule({
      id: 'corr-data-exfil',
      name: 'Data Exfiltration Campaign',
      description: 'Correlates data breach incidents within 30 minutes',
      type: 'threshold',
      conditions: [
        { field: 'type', operator: 'eq', value: 'data_breach' },
      ],
      timeWindowMs: 1800000,
      threshold: 2,
      severity: 'P0',
      incidentType: 'data_breach',
      enabled: true,
    });

    this.addRule({
      id: 'corr-repeated-low',
      name: 'Repeated Low-Severity Campaign',
      description: 'Many low-severity incidents may indicate reconnaissance',
      type: 'statistical',
      conditions: [
        { field: 'severity', operator: 'in', value: ['P3', 'P4'] },
      ],
      timeWindowMs: 7200000,
      threshold: 10,
      severity: 'P2',
      incidentType: 'intrusion',
      enabled: true,
    });

    this.addRule({
      id: 'corr-sequential-attack',
      name: 'Sequential Attack Pattern',
      description: 'Detects sequential patterns: probe → access → exfiltrate',
      type: 'sequential',
      conditions: [
        { field: 'type', operator: 'eq', value: 'intrusion' },
        { field: 'type', operator: 'eq', value: 'data_breach' },
      ],
      timeWindowMs: 3600000,
      threshold: 2,
      severity: 'P0',
      incidentType: 'intrusion',
      enabled: true,
    });
  }

  addRule(rule: CorrelationRule): void {
    this._rules.set(rule.id, rule);
    this._logger.info(`Correlation rule added: ${rule.name} (${rule.id})`);
  }

  removeRule(id: string): boolean {
    return this._rules.delete(id);
  }

  getRule(id: string): CorrelationRule | undefined {
    return this._rules.get(id);
  }

  listRules(): CorrelationRule[] {
    return Array.from(this._rules.values());
  }

  async evaluate(incident: Incident): Promise<CampaignAlert | null> {
    const windowKey = this._getWindowKey(incident);
    const windowed = this._incidentWindow.get(windowKey) || [];
    windowed.push(incident);

    const cutoff = Date.now() - 7200000;
    const recent = windowed.filter(i => i.timestamp >= cutoff);
    this._incidentWindow.set(windowKey, recent);

    if (recent.length > 100) {
      this._incidentWindow.set(windowKey, recent.slice(-100));
    }

    for (const rule of this._rules.values()) {
      if (!rule.enabled) continue;
      if (!this._matchesConditions(incident, rule.conditions)) continue;

      const matchingIncidents = recent.filter(i => this._matchesConditions(i, rule.conditions));
      const windowedIncidents = matchingIncidents.filter(i => i.timestamp >= Date.now() - rule.timeWindowMs);

      if (windowedIncidents.length >= rule.threshold) {
        return this._createOrUpdateCampaign(rule, windowedIncidents);
      }
    }

    return null;
  }

  async getActiveCampaigns(): Promise<CampaignAlert[]> {
    return Array.from(this._campaigns.values()).filter(c => c.status === 'investigating' || c.status === 'confirmed');
  }

  async getCampaign(id: string): Promise<CampaignAlert | undefined> {
    return this._campaigns.get(id);
  }

  async updateCampaignStatus(id: string, status: CampaignAlert['status']): Promise<boolean> {
    const campaign = this._campaigns.get(id);
    if (!campaign) return false;
    campaign.status = status;
    this._logger.info(`Campaign ${id} status updated to ${status}`);
    return true;
  }

  getCampaignStats(): { total: number; active: number; bySeverity: Record<string, number> } {
    const campaigns = Array.from(this._campaigns.values());
    const bySeverity: Record<string, number> = {};
    for (const c of campaigns) {
      bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
    }
    return {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'investigating' || c.status === 'confirmed').length,
      bySeverity,
    };
  }

  private _matchesConditions(incident: Incident, conditions: CorrelationCondition[]): boolean {
    return conditions.every(cond => {
      const value = (incident as unknown as Record<string, unknown>)[cond.field] as string | string[] | undefined;
      if (value === undefined) return false;
      switch (cond.operator) {
        case 'eq': return value === cond.value;
        case 'neq': return value !== cond.value;
        case 'in': return Array.isArray(cond.value) && (cond.value as string[]).includes(value as string);
        case 'contains': return typeof value === 'string' && typeof cond.value === 'string' && value.includes(cond.value);
        default: return false;
      }
    });
  }

  private _createOrUpdateCampaign(rule: CorrelationRule, incidents: Incident[]): CampaignAlert {
    const existingKey = `camp-${rule.id}`;
    const existing = this._campaigns.get(existingKey);

    const ids = [...new Set(incidents.map(i => i.id))];
    const severityOrder: IncidentSeverity[] = ['P0', 'P1', 'P2', 'P3', 'P4'];
    const maxSeverity = severityOrder.reduce((max, s) =>
      incidents.some(i => i.severity === s) ? s : max, 'P4' as IncidentSeverity
    );

    const score = Math.min(incidents.length / rule.threshold, 5) * 20;

    if (existing) {
      existing.incidentIds = [...new Set([...existing.incidentIds, ...ids])];
      existing.lastDetectedAt = Date.now();
      existing.incidentCount = existing.incidentIds.length;
      existing.severity = maxSeverity;
      existing.campaignScore = Math.max(existing.campaignScore, score);
      return existing;
    }

    const firstDetected = Math.min(...incidents.map(i => i.timestamp));
    const campaign: CampaignAlert = {
      id: existingKey,
      name: rule.name,
      description: `${rule.description} — ${ids.length} incidents detected`,
      incidentIds: ids,
      severity: maxSeverity,
      incidentType: rule.incidentType,
      firstDetectedAt: firstDetected,
      lastDetectedAt: Date.now(),
      incidentCount: ids.length,
      correlationRuleId: rule.id,
      campaignScore: score,
      status: 'investigating',
    };

    this._campaigns.set(existingKey, campaign);
    this._logger.warn(`Campaign detected: ${campaign.name} (${campaign.id}) — ${campaign.incidentCount} incidents, score ${campaign.campaignScore}`);
    return campaign;
  }

  private _getWindowKey(incident: Incident): string {
    return `${incident.agentId}:${incident.source}`;
  }
}
