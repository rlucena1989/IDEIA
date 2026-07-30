import { Logger, createLogger } from '@ideia/logger';
import type { IncidentSeverity, IncidentType, Playbook, PlaybookStep, PlaybookAction, PlaybookResult, PlaybookStepResult, ExecutedAction } from './types';

interface CircuitBreakerEntry {
  failures: number;
  successes: number;
  lastFailure: number;
  open: boolean;
}

export class CircuitBreaker {
  private readonly _state: Map<string, CircuitBreakerEntry> = new Map();

  constructor(
    private readonly _config: { failureThreshold: number; successThreshold: number; timeoutMs: number }
  ) {}

  isAllowed(actionType: string): boolean {
    const entry = this._state.get(actionType);
    if (!entry || !entry.open) return true;
    if (Date.now() - entry.lastFailure > this._config.timeoutMs) {
      entry.open = false;
      return true;
    }
    return false;
  }

  recordSuccess(actionType: string): void {
    const entry = this._state.get(actionType);
    if (entry) {
      entry.successes++;
      if (entry.successes >= this._config.successThreshold) {
        entry.open = false;
        entry.failures = 0;
        entry.successes = 0;
      }
    }
  }

  recordFailure(actionType: string): void {
    const entry = this._state.get(actionType) || { failures: 0, successes: 0, lastFailure: 0, open: false };
    entry.failures++;
    entry.lastFailure = Date.now();
    if (entry.failures >= this._config.failureThreshold) {
      entry.open = true;
    }
    this._state.set(actionType, entry);
  }

  getState(actionType: string): CircuitBreakerEntry | undefined {
    return this._state.get(actionType);
  }

  reset(actionType: string): void {
    this._state.delete(actionType);
  }

  resetAll(): void {
    this._state.clear();
  }
}

export class PlaybookEngine {
  private readonly _playbooks: Map<string, Playbook> = new Map();
  private readonly _circuitBreaker: CircuitBreaker;
  private readonly _logger: Logger;

  constructor(logger?: Logger) {
    this._logger = logger || createLogger('incident-response');
    this._circuitBreaker = new CircuitBreaker({ failureThreshold: 3, successThreshold: 2, timeoutMs: 30000 });
    this._registerDefaultPlaybooks();
  }

  private _registerDefaultPlaybooks(): void {
    this.register({
      id: 'pb-malware',
      name: 'Malware Response',
      incidentTypes: ['malware'],
      severityTargets: ['P0', 'P1', 'P2'],
      steps: [
        { order: 1, action: 'isolate_host', params: { agentId: '' }, expectedResult: 'Host isolated', fallback: 'block_agent', timeoutMs: 30000 },
        { order: 2, action: 'capture_memory', params: { agentId: '' }, expectedResult: 'Memory dump captured', fallback: 'skip', timeoutMs: 60000 },
        { order: 3, action: 'scan_filesystem', params: { agentId: '' }, expectedResult: 'Files scanned', fallback: 'skip', timeoutMs: 120000 },
        { order: 4, action: 'remove_artifacts', params: { agentId: '' }, expectedResult: 'Artifacts removed', fallback: 'flag_for_review', timeoutMs: 120000 },
        { order: 5, action: 'verify_integrity', params: { agentId: '' }, expectedResult: 'Integrity verified', fallback: 'escalate', timeoutMs: 60000 },
      ],
      validationCriteria: ['Agent is isolated', 'No malicious processes running', 'File system clean'],
      estimatedDurationMs: 390000,
    });
    this.register({
      id: 'pb-intrusion',
      name: 'Intrusion Response',
      incidentTypes: ['intrusion'],
      severityTargets: ['P0', 'P1'],
      steps: [
        { order: 1, action: 'block_agent', params: { agentId: '' }, expectedResult: 'Agent blocked', fallback: 'quarantine_agent', timeoutMs: 15000 },
        { order: 2, action: 'revoke_tokens', params: { agentId: '' }, expectedResult: 'Tokens revoked', fallback: 'escalate', timeoutMs: 15000 },
        { order: 3, action: 'capture_forensics', params: { agentId: '', depth: 'full' }, expectedResult: 'Forensics captured', fallback: 'skip', timeoutMs: 120000 },
        { order: 4, action: 'analyze_blast_radius', params: { agentId: '' }, expectedResult: 'Blast radius analyzed', fallback: 'skip', timeoutMs: 60000 },
        { order: 5, action: 'apply_containment', params: { agentId: '', strategy: 'network_isolation' }, expectedResult: 'Containment applied', fallback: 'freeze_workspace', timeoutMs: 30000 },
      ],
      validationCriteria: ['Access revoked', 'Containment verified', 'Forensics preserved'],
      estimatedDurationMs: 240000,
    });
    this.register({
      id: 'pb-data-breach',
      name: 'Data Breach Response',
      incidentTypes: ['data_breach'],
      severityTargets: ['P0', 'P1', 'P2'],
      steps: [
        { order: 1, action: 'revoke_tokens', params: { agentId: '' }, expectedResult: 'Tokens revoked', fallback: 'block_agent', timeoutMs: 15000 },
        { order: 2, action: 'block_agent', params: { agentId: '' }, expectedResult: 'Agent blocked', fallback: 'quarantine_agent', timeoutMs: 15000 },
        { order: 3, action: 'notify_compliance', params: { framework: 'GDPR' }, expectedResult: 'Compliance notified', fallback: 'log', timeoutMs: 30000 },
        { order: 4, action: 'capture_network_logs', params: { agentId: '', window: '3600000' }, expectedResult: 'Network logs captured', fallback: 'skip', timeoutMs: 120000 },
        { order: 5, action: 'assess_damage', params: { agentId: '' }, expectedResult: 'Damage assessed', fallback: 'flag_for_review', timeoutMs: 60000 },
      ],
      validationCriteria: ['Data exfiltration stopped', 'Access revoked', 'Regulatory notified'],
      estimatedDurationMs: 240000,
    });
    this.register({
      id: 'pb-dos',
      name: 'DoS Response',
      incidentTypes: ['dos'],
      severityTargets: ['P0', 'P1', 'P2'],
      steps: [
        { order: 1, action: 'rate_limit', params: { agentId: '', limit: '0' }, expectedResult: 'Agent rate limited', fallback: 'block_agent', timeoutMs: 10000 },
        { order: 2, action: 'apply_circuit_breaker', params: { service: 'agent-runtime', state: 'open' }, expectedResult: 'Circuit breaker open', fallback: 'block_agent', timeoutMs: 10000 },
        { order: 3, action: 'analyze_traffic', params: { agentId: '' }, expectedResult: 'Traffic analyzed', fallback: 'skip', timeoutMs: 60000 },
      ],
      validationCriteria: ['Traffic normalized', 'Circuit breaker active'],
      estimatedDurationMs: 80000,
    });
    this.register({
      id: 'pb-insider',
      name: 'Insider Threat Response',
      incidentTypes: ['insider'],
      severityTargets: ['P0', 'P1', 'P2'],
      steps: [
        { order: 1, action: 'freeze_workspace', params: { workspaceId: '' }, expectedResult: 'Workspace frozen', fallback: 'block_agent', timeoutMs: 15000 },
        { order: 2, action: 'revoke_tokens', params: { agentId: '' }, expectedResult: 'Tokens revoked', fallback: 'escalate', timeoutMs: 15000 },
        { order: 3, action: 'capture_audit_logs', params: { agentId: '' }, expectedResult: 'Audit logs captured', fallback: 'skip', timeoutMs: 60000 },
        { order: 4, action: 'notify_security', params: { channel: 'slack-urgent' }, expectedResult: 'Security notified', fallback: 'escalate', timeoutMs: 10000 },
      ],
      validationCriteria: ['Access revoked', 'Evidence preserved', 'Security notified'],
      estimatedDurationMs: 100000,
    });
  }

  register(playbook: Playbook): void {
    this._playbooks.set(playbook.id, playbook);
    this._logger.info(`Playbook registered: ${playbook.name} (${playbook.id})`);
  }

  unregister(id: string): boolean {
    return this._playbooks.delete(id);
  }

  getPlaybook(id: string): Playbook | undefined {
    return this._playbooks.get(id);
  }

  listPlaybooks(): Playbook[] {
    return Array.from(this._playbooks.values());
  }

  findPlaybooks(severity: IncidentSeverity, type: IncidentType): Playbook[] {
    return Array.from(this._playbooks.values()).filter(p =>
      p.severityTargets.includes(severity) && p.incidentTypes.includes(type)
    );
  }

  async execute(severity: IncidentSeverity, type: IncidentType, agentId: string): Promise<PlaybookResult> {
    const playbooks = this.findPlaybooks(severity, type);
    if (playbooks.length === 0) {
      this._logger.warn(`No playbook found for ${severity}/${type}, using default actions`);
      const defaultResult = await this._executeDefaultActions(severity, agentId);
      return defaultResult;
    }
    const playbook = playbooks[0];
    const startTime = Date.now();
    const stepResults: PlaybookStepResult[] = [];

    for (const step of playbook.steps) {
      const stepStart = Date.now();
      step.params.agentId = step.params.agentId || agentId;
      const actionType = step.action;

      if (!this._circuitBreaker.isAllowed(actionType)) {
        this._logger.warn(`Circuit breaker open for ${actionType}, executing fallback: ${step.fallback}`);
        const fallbackResult = await this._executeFallback(step, agentId);
        stepResults.push(fallbackResult);
        continue;
      }

      try {
        await this._executeAction(actionType, step.params);
        this._circuitBreaker.recordSuccess(actionType);
        stepResults.push({
          stepOrder: step.order,
          action: actionType,
          success: true,
          durationMs: Date.now() - stepStart,
        });
      } catch (error) {
        this._circuitBreaker.recordFailure(actionType);
        this._logger.error(`Playbook step ${step.order} (${actionType}) failed: ${String(error)}. Fallback: ${step.fallback}`);
        const fallbackResult = await this._executeFallback(step, agentId);
        stepResults.push({
          stepOrder: step.order,
          action: actionType,
          success: false,
          durationMs: Date.now() - stepStart,
          error: String(error),
        });
        if (fallbackResult.success) {
          stepResults.push(fallbackResult);
        }
      }
    }

    const allSuccess = stepResults.every(r => r.success);
    return {
      success: allSuccess,
      stepResults,
      durationMs: Date.now() - startTime,
      error: allSuccess ? undefined : 'Some playbook steps failed',
    };
  }

  private async _executeDefaultActions(severity: IncidentSeverity, agentId: string): Promise<PlaybookResult> {
    const startTime = Date.now();
    const stepResults: PlaybookStepResult[] = [];

    const actions: Array<{ type: string; priority: number }> = severity === 'P0'
      ? [
          { type: 'quarantine_agent', priority: 5 },
          { type: 'revoke_tokens', priority: 5 },
          { type: 'notify', priority: 4 },
          { type: 'capture_forensics', priority: 3 },
        ]
      : severity === 'P1'
        ? [
            { type: 'block_agent', priority: 3 },
            { type: 'revoke_tokens', priority: 3 },
            { type: 'notify', priority: 2 },
          ]
        : severity === 'P2'
          ? [
              { type: 'block_agent', priority: 2 },
              { type: 'flag_for_review', priority: 1 },
            ]
          : [
              { type: 'log', priority: 0 },
              { type: 'notify', priority: 0 },
            ];

    let order = 1;
    for (const action of actions) {
      const stepStart = Date.now();
      try {
        const params: Record<string, string> = { agentId };
        if (action.type === 'notify') {
          params.channel = severity === 'P0' ? 'pagerduty' : 'slack';
        }
        await this._executeAction(action.type, params);
        stepResults.push({
          stepOrder: order++,
          action: action.type,
          success: true,
          durationMs: Date.now() - stepStart,
        });
      } catch (error) {
        stepResults.push({
          stepOrder: order++,
          action: action.type,
          success: false,
          durationMs: Date.now() - stepStart,
          error: String(error),
        });
      }
    }

    return {
      success: stepResults.every(r => r.success),
      stepResults,
      durationMs: Date.now() - startTime,
    };
  }

  private async _executeFallback(step: PlaybookStep, agentId: string): Promise<PlaybookStepResult> {
    const stepStart = Date.now();
    try {
      const params: Record<string, string> = { agentId };
      if (step.fallback === 'skip') {
        return { stepOrder: step.order, action: 'skip', success: true, durationMs: 0 };
      }
      if (step.fallback === 'escalate') {
        this._logger.warn(`Escalation required for step ${step.order}`);
        return { stepOrder: step.order, action: 'escalate', success: true, durationMs: 0 };
      }
      if (step.fallback === 'flag_for_review') {
        this._logger.warn(`Flagged for review: step ${step.order}`);
        return { stepOrder: step.order, action: 'flag_for_review', success: true, durationMs: 0 };
      }
      await this._executeAction(step.fallback, params);
      return {
        stepOrder: step.order,
        action: step.fallback,
        success: true,
        durationMs: Date.now() - stepStart,
      };
    } catch (error) {
      return {
        stepOrder: step.order,
        action: step.fallback,
        success: false,
        durationMs: Date.now() - stepStart,
        error: String(error),
      };
    }
  }

  private async _executeAction(actionType: string, params: Record<string, string>): Promise<void> {
    this._logger.info(`Executing action: ${actionType}`, params);
    switch (actionType) {
      case 'log':
        break;
      case 'block_agent':
      case 'quarantine_agent':
      case 'isolate_host':
        break;
      case 'revoke_tokens':
        break;
      case 'freeze_workspace':
        break;
      case 'capture_memory':
      case 'capture_forensics':
      case 'capture_network_logs':
      case 'capture_audit_logs':
        break;
      case 'scan_filesystem':
        break;
      case 'remove_artifacts':
        break;
      case 'verify_integrity':
        break;
      case 'analyze_blast_radius':
        break;
      case 'apply_containment':
        break;
      case 'assess_damage':
        break;
      case 'analyze_traffic':
        break;
      case 'notify':
      case 'notify_compliance':
      case 'notify_security':
      case 'notify_executives':
        break;
      case 'rate_limit':
        break;
      case 'apply_circuit_breaker':
        break;
      case 'rotate_keys':
        break;
      case 'flag_for_review':
        break;
      default:
        this._logger.warn(`Unknown action type: ${actionType}`);
    }
  }

  async executeActions(actions: PlaybookAction[], agentId: string): Promise<ExecutedAction[]> {
    const results: ExecutedAction[] = [];
    for (const action of actions) {
      const resolved = { ...action, agentId: action.agentId || agentId };
      if (!this._circuitBreaker.isAllowed(resolved.type)) {
        results.push({
          type: resolved.type,
          success: false,
          error: 'Circuit breaker open',
          timestamp: Date.now(),
        });
        continue;
      }
      try {
        const params: Record<string, string> = { agentId };
        if (resolved.channel) params.channel = resolved.channel;
        if (resolved.depth) params.depth = resolved.depth;
        await this._executeAction(resolved.type, params);
        this._circuitBreaker.recordSuccess(resolved.type);
        results.push({ type: resolved.type, success: true, timestamp: Date.now() });
      } catch (error) {
        this._circuitBreaker.recordFailure(resolved.type);
        results.push({
          type: resolved.type,
          success: false,
          error: String(error),
          timestamp: Date.now(),
        });
      }
    }
    return results;
  }

  getCircuitBreakerState(): Map<string, CircuitBreakerEntry> {
    return this._circuitBreaker['_state'];
  }
}
