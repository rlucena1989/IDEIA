import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_PROJECT_PANEL_SERVICE, IDEIA_ProjectPanelService, ProjectPanelData } from '../common/ideia-protocol';
import { ErrorBoundary } from './ideia-error-boundary';

@injectable()
export class IDEIA_ProjectPanelWidget extends BaseWidget {
  static ID = 'ideia:project-panel';
  static LABEL = 'Project Panel';

  private root: Root | undefined;
  private refreshInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    @inject(IDEIA_PROJECT_PANEL_SERVICE) private readonly projectPanelService: IDEIA_ProjectPanelService,
  ) {
    super();
    this.id = IDEIA_ProjectPanelWidget.ID;
    this.title.label = IDEIA_ProjectPanelWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-project';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  protected override onAfterAttach(): void {
    this.renderReact();
  }

  protected override onResize(): void {
    this.renderReact();
  }

  protected onDetach(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private renderReact(): void {
    if (!this.root) {
      this.root = createRoot(this.node);
    }
    this.root.render(
      <ErrorBoundary>
      <ProjectPanelComponent service={this.projectPanelService} />
      </ErrorBoundary>
    );
  }
}

const ProjectPanelComponent: React.FC<{ service: IDEIA_ProjectPanelService }> = ({ service }) => {
  const [data, setData] = React.useState<ProjectPanelData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await service.getProjectData();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [service]);

  React.useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !data) {
    return (
      <div style={{ padding: '16px', color: 'var(--theia-descriptionForeground)', fontSize: '12px' }}>
        Loading project data...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: '16px', color: 'var(--theia-errorForeground)', fontSize: '12px' }}>
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '16px', color: 'var(--theia-descriptionForeground)', fontSize: '12px' }}>
        No project data available
      </div>
    );
  }

  return (
    <div style={{ padding: '12px', color: 'var(--theia-foreground)', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0' }}>{data.projectName}</h2>

      <Section title="Structure">
        <Metric label="Directories" value={String((data as any).structure.directories)} />
        <Metric label="Files" value={String((data as any).structure.files)} />
        <Metric label="Source Files" value={String((data as any).structure.sourceFiles)} />
        <Metric label="Config Files" value={String((data as any).structure.configFiles)} />
        <Metric label="Test Files" value={String((data as any).structure.testFiles)} />
      </Section>

      <Section title="Languages">
        {(data as any).languages.length === 0 && <Info>No languages detected</Info>}
        {(data as any).languages.map((lang: any) => (
          <div key={lang.name} style={{ display: 'flex', alignItems: 'center', fontSize: '12px', padding: '3px 0' }}>
            <span style={{ flex: 1, fontWeight: 500 }}>{lang.name}</span>
            <span style={{ opacity: 0.6 }}>{lang.files} files</span>
            <div style={{
              width: '60px', height: '6px', borderRadius: '3px', background: 'var(--theia-border-color)', marginLeft: '8px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '3px', background: '#3b82f6', width: `${Math.min(100, lang.percentage * 100)}%`,
              }} />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Dependencies">
        {(data as any).dependencies.length === 0 && <Info>No dependencies detected</Info>}
        {(data as any).dependencies.map((dep: any, idx: any) => (
          <div key={`${dep.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', fontSize: '11px', padding: '2px 0' }}>
            <span style={{ flex: 1 }}>{dep.name}</span>
            <span style={{ opacity: 0.5, fontSize: '10px', marginRight: '6px' }}>{dep.category}</span>
            {dep.version && <span style={{ opacity: 0.4, fontSize: '10px' }}>v{dep.version}</span>}
          </div>
        ))}
      </Section>

      <Section title="Suggestions">
        {(data as any).suggestions.length === 0 && <Info>No suggestions</Info>}
        {(data as any).suggestions.map((s: any, idx: any) => (
          <div key={idx} style={{ fontSize: '11px', padding: '4px 8px', marginBottom: '2px', background: 'var(--theia-sideBar-background)', borderRadius: '3px' }}>
            <span style={{ opacity: 0.9 }}>{s}</span>
          </div>
        ))}
      </Section>

      <div style={{ fontSize: '10px', opacity: 0.4, marginTop: '12px', textAlign: 'right' }}>
        Last scan: {new Date((data as any).scannedAt).toLocaleTimeString()}
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '14px' }}>
    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--theia-descriptionForeground)', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid var(--theia-border-color)', paddingBottom: '4px' }}>
      {title}
    </div>
    {children}
  </div>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', padding: '2px 0' }}>
    <span style={{ flex: 1, opacity: 0.7 }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
);

const Info: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: '11px', opacity: 0.5, padding: '4px 0' }}>{children}</div>
);
