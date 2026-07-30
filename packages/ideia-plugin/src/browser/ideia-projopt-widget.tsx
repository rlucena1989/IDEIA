import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_BHP_SERVICE } from '../common/ideia-protocol';
import { ErrorBoundary } from './ideia-error-boundary';

@injectable()
export class IDEIA_ProjOptWidget extends BaseWidget {
  static ID = 'ideia:projopt';
  static LABEL = 'Project Optimization';

  private root: Root | undefined;
  private report: any | null = null;
  private suggestions: any[] = [];
  private previewText: string | null = null;
  private previewSuggestionId: string | null = null;
  private applyingId: string | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    @inject(IDEIA_BHP_SERVICE) private bhpService: any
  ) {
    super({});
    this.id = IDEIA_ProjOptWidget.ID;
    this.title.label = IDEIA_ProjOptWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-rocket';
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
      const [report, suggestions] = await Promise.all([
        this.bhpService.getReport(),
        this.bhpService.getSuggestions(),
      ]);
      this.report = report;
      this.suggestions = suggestions;
      this.renderReact();
    } catch {
      /* silent fail for auto-refresh */
    }
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
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    return (
      <ErrorBoundary>
      <div style={{ fontFamily: 'var(--theia-ui-font-family)', color: 'var(--theia-foreground)', fontSize: '13px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="codicon codicon-rocket" />
          Project Optimization
        </h2>

        {this.report && this.renderReport()}

        {this.renderSuggestions()}

        {this.previewText && this.renderPreview()}
      </div>
      </ErrorBoundary>
    );
  }

  private renderReport(): React.ReactElement {
    const r = this.report;
    if (!r) return <></>;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--theia-border-color)', background: 'var(--theia-sideBar-background)', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{this.formatSize(r.projectSize)}</div>
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>Project Size</div>
        </div>
        <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--theia-border-color)', background: 'var(--theia-sideBar-background)', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{r.fileCount}</div>
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>Files</div>
        </div>
        <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--theia-border-color)', background: 'var(--theia-sideBar-background)', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>{r.languages.length}</div>
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>Languages</div>
          <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '2px' }}>{r.languages.join(', ')}</div>
        </div>
        <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--theia-border-color)', background: 'var(--theia-sideBar-background)', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: r.outdatedDeps > 0 ? '#ef4444' : '#10b981' }}>{r.outdatedDeps}/{r.totalDeps}</div>
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>Outdated Dependencies</div>
        </div>
      </div>
    );
  }

  private renderSuggestions(): React.ReactElement {
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--theia-infoForeground)' }}>Optimization Suggestions</h3>
        {this.suggestions.length === 0 && (
          <div style={{ fontSize: '12px', opacity: 0.6, padding: '12px', textAlign: 'center' }}>No suggestions available</div>
        )}
        {this.suggestions.map(s => (
          <div key={s.id} style={{
            padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--theia-border-color)',
            background: 'var(--theia-sideBar-background)', marginBottom: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px',
                background: s.impact === 'high' ? 'var(--theia-errorBackground)' : s.impact === 'medium' ? 'var(--theia-warningBackground)' : 'var(--theia-infoBackground)',
                color: '#fff',
              }}>
                {s.impact.toUpperCase()}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>{s.description}</span>
              <span style={{ fontSize: '10px', opacity: 0.6 }}>{s.effort}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => this.handlePreview(s.id)}
                style={{
                  fontSize: '10px', padding: '3px 10px', borderRadius: '4px',
                  border: '1px solid var(--theia-border-color)', background: 'transparent',
                  color: 'var(--theia-foreground)', cursor: 'pointer',
                }}
              >
                Preview
              </button>
              <button
                onClick={() => this.handleApply(s.id)}
                disabled={this.applyingId === s.id}
                style={{
                  fontSize: '10px', padding: '3px 10px', borderRadius: '4px',
                  border: 'none', background: 'var(--theia-button-background)',
                  color: 'var(--theia-button-foreground)', cursor: 'pointer',
                  opacity: this.applyingId === s.id ? 0.6 : 1,
                }}
              >
                {this.applyingId === s.id ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  private renderPreview(): React.ReactElement {
    return (
      <div style={{
        padding: '12px', borderRadius: '6px', border: '1px solid var(--theia-border-color)',
        background: 'var(--theia-sideBar-background)', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Preview</span>
          <button
            onClick={() => { this.previewText = null; this.previewSuggestionId = null; this.renderReact(); }}
            style={{
              marginLeft: 'auto', fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
              border: '1px solid var(--theia-border-color)', background: 'transparent',
              color: 'var(--theia-foreground)', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
        <pre style={{ fontSize: '11px', opacity: 0.8, whiteSpace: 'pre-wrap', margin: 0 }}>{this.previewText}</pre>
      </div>
    );
  }

  private async handlePreview(id: string): Promise<void> {
    try {
      const text = await this.bhpService.previewOptimization(id);
      this.previewText = text;
      this.previewSuggestionId = id;
      this.renderReact();
    } catch {
      /* silent */
    }
  }

  private async handleApply(id: string): Promise<void> {
    this.applyingId = id;
    this.renderReact();
    try {
      await this.bhpService.applyOptimization(id);
      await this.refreshData();
    } catch {
      /* silent */
    }
    this.applyingId = null;
  }

  private formatSize(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}MB`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}KB`;
    return `${n}B`;
  }
}
