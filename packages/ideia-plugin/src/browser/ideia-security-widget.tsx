import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_SECURITY_SERVICE, IDEIA_SecurityService, SecurityMetrics, ComplianceReport, ComplianceFramework } from '../common/ideia-protocol';

const FRAMEWORK_COLORS: Record<ComplianceFramework, string> = {
  lgpd: '#16a34a',
  hipaa: '#dc2626',
  gdpr: '#2563eb',
  soc2: '#ea580c',
};

const FRAMEWORK_NAMES: Record<ComplianceFramework, string> = {
  lgpd: 'LGPD',
  hipaa: 'HIPAA',
  gdpr: 'GDPR',
  soc2: 'SOC2',
};

@injectable()
export class IDEIA_SecurityWidget extends BaseWidget {
  static ID = 'ideia:security';
  static LABEL = 'Security Dashboard';

  private root: Root | undefined;
  private metrics: SecurityMetrics | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    @inject(IDEIA_SECURITY_SERVICE) private securityService: IDEIA_SecurityService,
  ) {
    super();
    this.id = IDEIA_SecurityWidget.ID;
    this.title.label = IDEIA_SecurityWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-shield';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  @postConstruct()
  async init(): Promise<void> {
    await this.refreshData();
    this.refreshInterval = setInterval(() => this.refreshData(), 60000);
    this.toDisposeOnDetach.push({ dispose: () => { if (this.refreshInterval) clearInterval(this.refreshInterval); } });
  }

  private async refreshData(): Promise<void> {
    try {
      this.metrics = await this.securityService.getSecurityMetrics();
      this.renderReact();
    } catch { /* silent fail for auto-refresh */ }
  }

  protected override onAfterAttach(): void {
    this.renderReact();
  }

  protected onDetach(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  private renderReact(): void {
    if (!this.root) {
      const container = document.createElement('div');
      container.style.padding = '16px';
      container.style.height = '100%';
      this.node.appendChild(container);
      this.root = createRoot(container);
    }
    this.root.render(<SecurityComponent metrics={this.metrics} />);
  }
}

const SecurityComponent: React.FC<{ metrics: SecurityMetrics | null }> = ({ metrics }) => {
  if (!metrics) {
    return <div style={{ padding: '12px', color: '#666', fontSize: '12px' }}>Loading security metrics...</div>;
  }

  const scoreColor = metrics.overallScore >= 80 ? '#16a34a' : metrics.overallScore >= 50 ? '#ea580c' : '#dc2626';

  return (
    <div style={{ fontFamily: 'var(--theia-ui-font-family)', color: 'var(--theia-foreground)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Security Dashboard</h2>
        <span style={{ fontSize: '11px', color: '#888', background: 'var(--theia-sideBar-background)', padding: '2px 8px', borderRadius: '4px' }}>
          {new Date(metrics.lastAudit).toLocaleTimeString()}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', marginBottom: '20px' }}>
        <MetricCard label="Compliance Score" value={`${metrics.overallScore}%`} color={scoreColor} />
        <MetricCard label="Policies" value={String(metrics.totalPolicies)} color="var(--theia-infoForeground)" />
        <MetricCard label="Policy Pass" value={`${metrics.policyAuditStatus.passed}/${metrics.policyAuditStatus.total}`} color={metrics.policyAuditStatus.failed === 0 ? '#16a34a' : '#dc2626'} />
        <MetricCard label="Policy Fail" value={String(metrics.policyAuditStatus.failed)} color={metrics.policyAuditStatus.failed > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>Compliance Frameworks</h3>
      <div style={{ marginBottom: '16px' }}>
        {metrics.complianceReports.map(report => (
          <ComplianceCard key={report.framework} report={report} />
        ))}
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>Compliance Details</h3>
      {metrics.complianceReports.flatMap(report => report.checks.slice(0, 6)).map(check => (
        <div key={check.id} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
          fontSize: '12px', borderBottom: '1px solid var(--theia-border-color)',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
            background: check.status === 'pass' ? '#16a34a' : check.severity === 'critical' ? '#dc2626' : '#ea580c',
          }} />
          <span style={{ flex: 1 }}>{check.id}: {check.description}</span>
          <span style={{
            fontSize: '10px', padding: '1px 6px', borderRadius: '3px', fontWeight: 600,
            background: check.status === 'pass' ? 'var(--theia-successBackground)' : 'var(--theia-errorBackground)',
            color: '#fff',
          }}>
            {check.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    padding: '12px', borderRadius: '6px', border: '1px solid var(--theia-border-color)',
    background: 'var(--theia-sideBar-background)', textAlign: 'center',
  }}>
    <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>{label}</div>
  </div>
);

const ComplianceCard: React.FC<{ report: ComplianceReport }> = ({ report }) => {
  const failed = report.checks.filter(c => c.status === 'fail');
  return (
    <div style={{
      background: 'var(--theia-sideBar-background)', borderRadius: '6px',
      padding: '10px 12px', marginBottom: '6px',
      borderLeft: `3px solid ${FRAMEWORK_COLORS[report.framework]}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>{FRAMEWORK_NAMES[report.framework]}</span>
        <span style={{
          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
          background: report.score >= 80 ? '#14532d' : report.score >= 50 ? '#431407' : '#450a0a',
          color: report.score >= 80 ? '#86efac' : report.score >= 50 ? '#fdba74' : '#fca5a5',
        }}>
          {report.score}%
        </span>
      </div>
      <div style={{ fontSize: '11px', color: '#999' }}>{report.summary}</div>
      {failed.length > 0 && (
        <div style={{ fontSize: '10px', color: '#fca5a5', marginTop: '4px' }}>
          {failed.length} failed check(s)
        </div>
      )}
    </div>
  );
};
