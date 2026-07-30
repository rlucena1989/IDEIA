import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_CONFIG_SERVICE } from '../common/ideia-protocol';
import { IDEIA_ConfigService } from '../common/ideia-protocol';
import { ConfigSectionCard, ConfigSection, createDefaultConfig } from './ideia-config-sections';
import { ErrorBoundary as IDEIA_ErrorBoundary } from './ideia-error-boundary';

@injectable()
export class IDEIA_ConfigWidget extends BaseWidget {
  static ID = 'ideia:config';
  static LABEL = 'IDEIA Configuration';

  private root: Root | undefined;
  private sections: Record<string, ConfigSection> = createDefaultConfig();
  private modifiedFields: Set<string> = new Set();
  private previewMode = false;
  private previewData: Record<string, unknown> | null = null;
  private loadError: string | null = null;

  constructor(
    @inject(IDEIA_CONFIG_SERVICE) private configService: IDEIA_ConfigService,
  ) {
    super();
    this.id = IDEIA_ConfigWidget.ID;
    this.title.label = IDEIA_ConfigWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-settings-gear';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  @postConstruct()
  async init(): Promise<void> {
    try {
      const config = await this.configService.getFullConfig();
      if (config && Object.keys(config).length > 0) {
        this.applyConfigToSections(config);
      }
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Failed to load configuration';
    }
    this.renderReact();
  }

  private applyConfigToSections(config: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(config)) {
      for (const section of Object.values(this.sections)) {
        const field = section.fields.find(f => f.id === key);
        if (field) {
          field.value = value;
        }
      }
    }
  }

  private collectConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const section of Object.values(this.sections)) {
      for (const field of section.fields) {
        config[field.id] = field.value;
      }
    }
    return config;
  }

  private handleFieldChange(sectionId: string, fieldId: string, value: unknown): void {
    const section = this.sections[sectionId];
    if (!section) return;
    const field = section.fields.find(f => f.id === fieldId);
    if (!field) return;
    field.value = value;
    this.modifiedFields.add(fieldId);
    this.renderReact();
  }

  private handleResetSection(sectionId: string): void {
    const section = this.sections[sectionId];
    if (!section) return;
    for (const field of section.fields) {
      field.value = field.defaultValue;
      this.modifiedFields.delete(field.id);
    }
    this.renderReact();
  }

  private async handleSave(): Promise<void> {
    const config = this.collectConfig();
    try {
      for (const [key, value] of Object.entries(config)) {
        await this.configService.setConfig(key, value);
      }
      this.modifiedFields.clear();
      this.renderReact();
    } catch {
      /* silent */
    }
  }

  private handlePreview(): void {
    this.previewData = this.collectConfig();
    this.previewMode = true;
    this.renderReact();
  }

  private handleCancelPreview(): void {
    this.previewMode = false;
    this.previewData = null;
    this.renderReact();
  }

  private async handleResetAll(): Promise<void> {
    const defaults = createDefaultConfig();
    this.sections = defaults;
    this.modifiedFields.clear();
    try {
      for (const field of Object.values(defaults).flatMap(s => s.fields)) {
        await this.configService.setConfig(field.id, field.defaultValue as never);
      }
    } catch {
      /* silent */
    }
    this.renderReact();
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
      <IDEIA_ErrorBoundary>
      <div style={{ fontFamily: 'var(--theia-ui-font-family)', color: 'var(--theia-foreground)', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="codicon codicon-settings-gear" />
            IDEIA Configuration
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => this.handlePreview()}
              style={{
                padding: '4px 12px', borderRadius: '4px',
                border: '1px solid var(--theia-border-color)',
                background: 'transparent', color: 'var(--theia-foreground)',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
              }}
            >
              Preview
            </button>
            <button
              onClick={() => this.handleResetAll()}
              style={{
                padding: '4px 12px', borderRadius: '4px',
                border: '1px solid var(--theia-border-color)',
                background: 'transparent', color: 'var(--theia-foreground)',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
              }}
            >
              Reset All
            </button>
            <button
              onClick={() => this.handleSave()}
              disabled={this.modifiedFields.size === 0}
              style={{
                padding: '4px 12px', borderRadius: '4px',
                border: 'none',
                background: this.modifiedFields.size === 0 ? 'var(--theia-disabledForeground)' : 'var(--theia-button-background)',
                color: 'var(--theia-button-foreground)',
                cursor: this.modifiedFields.size === 0 ? 'default' : 'pointer',
                fontSize: '11px', fontWeight: 600,
              }}
            >
              Save Changes
            </button>
          </div>
        </div>

        {this.modifiedFields.size > 0 && (
          <div style={{
            padding: '8px 12px', borderRadius: '4px', marginBottom: '12px',
            background: 'var(--theia-warningBackground)', color: '#fff',
            fontSize: '11px', fontWeight: 500,
          }}>
            {this.modifiedFields.size} field(s) modified — save or reset to discard changes
          </div>
        )}

        {this.previewMode && this.previewData ? (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Preview — Changes to be applied</h3>
              <button
                onClick={() => this.handleCancelPreview()}
                style={{
                  padding: '3px 10px', borderRadius: '4px',
                  border: '1px solid var(--theia-border-color)',
                  background: 'transparent', color: 'var(--theia-foreground)',
                  cursor: 'pointer', fontSize: '11px',
                }}
              >
                Close Preview
              </button>
            </div>
            <pre style={{
              padding: '12px', borderRadius: '6px',
              background: 'var(--theia-editor-background)',
              border: '1px solid var(--theia-border-color)',
              fontSize: '11px', overflow: 'auto', maxHeight: '300px',
              fontFamily: 'var(--theia-monospace-fontFamily)',
            }}>
              {JSON.stringify(this.previewData, null, 2)}
            </pre>
          </div>
        ) : null}

        {Object.values(this.sections).map(section => (
          <ConfigSectionCard
            key={section.id}
            section={section}
            onChange={(fieldId, value) => this.handleFieldChange(section.id, fieldId, value)}
            onReset={() => this.handleResetSection(section.id)}
            modifiedFields={this.modifiedFields}
          />
        ))}
      </div>
      </IDEIA_ErrorBoundary>
    );
  }
}
