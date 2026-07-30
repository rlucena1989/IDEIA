import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { ErrorBoundary } from './ideia-error-boundary';
import { IDEIA_DASHBOARD_SERVICE, IDEIA_DashboardService } from '../common/ideia-protocol';

@injectable()
export class IDEIA_SelfChatWidget extends BaseWidget {
  static ID = 'ideia:selfchat';
  static LABEL = 'IDEIA Self Chat';

  private root: Root | undefined;
  private query = '';
  private response = '';
  private metricsInfo = '';

  constructor(
    @inject(IDEIA_DASHBOARD_SERVICE) private readonly dashboardService: IDEIA_DashboardService,
  ) {
    super();
    this.id = IDEIA_SelfChatWidget.ID;
    this.title.label = IDEIA_SelfChatWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-comment-discussion';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  protected override onAfterAttach(): void {
    this.loadMetrics();
    this.render();
  }

  private async loadMetrics(): Promise<void> {
    try {
      const metrics = await this.dashboardService.getMetrics();
      this.metricsInfo = `Tasks: ${metrics.tasksCompleted} completed, ${metrics.tasksFailed} failed. ` +
        `Agents: ${(metrics as any).activeAgents} active. Uptime: ${Math.floor((metrics as any).uptime / 3600)}h.`;
    } catch {
      this.metricsInfo = 'Real-time metrics unavailable. Using static reference data.';
    }
    this.render();
  }

  protected override onActivateRequest(): void {
    this.node.focus();
    this.render();
  }

  private render(): void {
    if (!this.root) this.root = createRoot(this.node);
    this.root.render(<ErrorBoundary><SelfChatPanel
      query={this.query}
      response={this.response}
      onQuery={q => { this.query = q; this.response = this.answer(q); this.render(); }}
    /></ErrorBoundary>);
  }

  private answer(query: string): string {
    const q = query.toLowerCase().trim();
    if (q.includes('event') && q.includes('bus')) return 'EventBus distribui eventos via NATS JetStream. Pub/Sub assíncrono com filas, DLQ e fallback in-memory. ' + this.metricsInfo;
    if (q.includes('package')) return '145+ packages incluindo agent-runtime, policy-engine, audit-trail, event-bus, memory-store e mais. Todos compilam com tsc --noEmit = 0 erros.';
    if (q.includes('architecture')) return 'Clean Architecture + DDD. 8 camadas: Shell → Theia → Agentes → Inteligência → Memória → Mensageria → Segurança → Dados.';
    if (q.includes('adr')) return 'Use "IDEIA adr new <title>" ou "IDEIA adr create" para gerar ADRs no formato MADR.';
    if (q.includes('autonomy')) return 'N0 (Assistido) a N4 (Total). Cada nível define o grau de independência dos agentes.';
    if (q.includes('agent') || q.includes('runtime')) return 'AgentRuntime executa tarefas com steps: analyze, plan, execute, verify. 8 agentes especializados. ' + this.metricsInfo;
    if (q.includes('policy') || q.includes('security')) return 'PolicyEngine com 27 patterns. SafetyCircuit com 5 breakers. Audit trail SHA-256. 31 regras PII.';
    if (q.includes('test')) return '580+ test files, ~4700+ testes. Frameworks: Jest, Vitest, Pact, k6. Coverage tracking automático.';
    if (q.includes('metric') || q.includes('status')) return this.metricsInfo || 'Loading metrics...';
    return `Pergunte sobre: EventBus, packages, architecture, ADR, autonomy, agents, security, tests, metrics`;
  }

  override dispose(): void {
    this.root?.unmount();
    super.dispose();
  }
}

const FAQ_ITEMS = [
  { q: 'What is IDEIA?', a: 'IDEIA is an AI-powered development platform.' },
  { q: 'How do I configure agents?', a: 'Use the settings panel.' },
  { q: 'How to run tests?', a: 'Use IDEIA test command.' },
];

function SelfChatPanel({ query, response, onQuery }: {
  query: string;
  response: string;
  onQuery: (q: string) => void;
}): React.ReactElement {
  return (
    <div style={{ padding: '12px', fontFamily: 'var(--theia-ui-font-family)' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>IDEIA Self Chat</h2>
      <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
        Ask questions about the IDEIA system itself.
      </p>
      <input
        type="text"
        placeholder="Ask about IDEIA..."
        value={query}
        onChange={e => onQuery(e.target.value)}
        style={{
          width: '100%', padding: '8px', marginBottom: '12px',
          border: '1px solid var(--theia-input-border)',
          background: 'var(--theia-input-background)',
          color: 'var(--theia-input-foreground)',
          borderRadius: '4px', boxSizing: 'border-box',
        }}
      />
      {response && (
        <div style={{ padding: '10px', borderRadius: '4px', background: 'var(--theia-list-hoverBackground)', fontSize: '13px', lineHeight: 1.5 }}>
          {response}
        </div>
      )}
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '6px' }}>Quick questions:</div>
        {FAQ_ITEMS.map((item: any) => (
          <button
            key={item.q}
            onClick={() => onQuery(item.q)}
            style={{
              display: 'block', width: '100%', padding: '6px 8px', marginBottom: '4px',
              textAlign: 'left', cursor: 'pointer',
              border: '1px solid var(--theia-dropdown-border)',
              borderRadius: '4px', fontSize: '12px',
              background: 'transparent', color: 'var(--theia-foreground)',
            }}
          >{item.q}</button>
        ))}
      </div>
    </div>
  );
}
