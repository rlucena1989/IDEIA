import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { OnboardingWizard, WIZARD_STEPS, PROFILES } from '@ideia/onboarding-wizard';
import type { WizardStep, WizardField, WizardSummary } from '@ideia/onboarding-wizard';
import { IDEIA_SkeletonLoader } from './ideia-skeleton';
import { ErrorBoundary } from './ideia-error-boundary';

interface StepState {
  values: Record<string, string | number | boolean | string[]>;
}

@injectable()
export class IDEIA_OnboardingWidget extends BaseWidget {
  static ID = 'ideia:onboarding';
  static LABEL = 'IDEIA Onboarding';

  private root: Root | undefined;
  private wizard: OnboardingWizard;
  private currentStep: WizardStep | null = null;
  private stepStates: Map<string, StepState> = new Map();
  private completed = false;
  private summary: WizardSummary | null = null;
  private currentStepIndex = 0;
  private totalSteps = 0;

  constructor() {
    super();
    this.id = IDEIA_OnboardingWidget.ID;
    this.title.label = IDEIA_OnboardingWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-rocket';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
    this.wizard = new OnboardingWizard();
  }

  @postConstruct()
  async init(): Promise<void> {
    const firstStep = this.wizard.start('quick');
    this.currentStep = firstStep;
    this.currentStepIndex = 0;
    this.totalSteps = this.getFilteredSteps().length;
    this.renderReact();
  }

  private getFilteredSteps(): WizardStep[] {
    return WIZARD_STEPS.filter(s => !s.expertOnly);
  }

  private getStepState(stepId: string): StepState {
    if (!this.stepStates.has(stepId)) {
      const step = this.getFilteredSteps().find(s => s.id === stepId);
      const values: Record<string, string | number | boolean | string[]> = {};
      if (step) {
        for (const field of step.fields) {
          values[field.id] = field.defaultValue ?? (field.type === 'toggle' ? false : field.type === 'multiselect' ? [] : '');
        }
      }
      this.stepStates.set(stepId, { values });
    }
    const state = this.stepStates.get(stepId);
    if (!state) throw new Error(`Step state not found: ${stepId}`);
    return state;
  }

  private handleFieldChange(fieldId: string, value: string | number | boolean | string[]): void {
    if (!this.currentStep) return;
    const state = this.getStepState(this.currentStep.id);
    state.values[fieldId] = value;
    this.renderReact();
  }

  private handleNext(): void {
    if (!this.currentStep) return;
    const state = this.getStepState(this.currentStep.id);
    try {
      const result = this.wizard.submitStep({ stepId: this.currentStep.id, answers: state.values });
      if (result.complete) {
        this.summary = this.wizard.complete();
        this.completed = true;
        this.currentStep = null;
        this.renderReact();
        return;
      }
      this.currentStep = result.next;
      this.currentStepIndex++;
      this.renderReact();
    } catch {
      /* silent */
    }
  }

  private handlePrevious(): void {
    const steps = this.getFilteredSteps();
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.currentStep = steps[this.currentStepIndex];
      this.renderReact();
    }
  }

  private handleRestart(): void {
    this.stepStates.clear();
    this.completed = false;
    this.summary = null;
    this.currentStepIndex = 0;
    const firstStep = this.wizard.start('quick');
    this.currentStep = firstStep;
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
      <ErrorBoundary>
        <div style={{ fontFamily: 'var(--theia-ui-font-family)', color: 'var(--theia-foreground)', fontSize: '13px' }}>
          {this.completed && this.summary ? this.renderSummary() : this.renderWizard()}
        </div>
      </ErrorBoundary>
    );
  }

  private renderWizard(): React.ReactElement {
    if (!this.currentStep) {
      return <IDEIA_SkeletonLoader variant="card" />;
    }

    const state = this.getStepState(this.currentStep.id);

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span className="codicon codicon-rocket" style={{ fontSize: '18px', color: 'var(--theia-button-background)' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>IDEIA Setup Wizard</h2>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {this.getFilteredSteps().map((step, i) => (
            <div
              key={step.id}
              style={{
                flex: 1, height: '4px', borderRadius: '2px',
                background: i === this.currentStepIndex ? 'var(--theia-button-background)' :
                           i < this.currentStepIndex ? 'var(--theia-successBackground)' :
                           'var(--theia-border-color)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        <div style={{
          padding: '16px', borderRadius: '6px',
          border: '1px solid var(--theia-border-color)',
          background: 'var(--theia-sideBar-background)',
          marginBottom: '16px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>{this.currentStep.title}</h3>
          <p style={{ fontSize: '11px', opacity: 0.7, margin: '0 0 16px 0' }}>{this.currentStep.description}</p>

          {this.currentStep.fields.map(field => (
            <div key={field.id} style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                {field.label}
                {field.required && <span style={{ color: 'var(--theia-errorForeground)', marginLeft: '2px' }}>*</span>}
              </label>
              {this.renderField(field, state.values[field.id] ?? '')}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => this.handlePrevious()}
            disabled={this.currentStepIndex === 0}
            style={{
              padding: '6px 16px', borderRadius: '4px',
              border: '1px solid var(--theia-border-color)',
              background: 'transparent', color: 'var(--theia-foreground)',
              cursor: this.currentStepIndex === 0 ? 'default' : 'pointer',
              fontSize: '12px', fontWeight: 600,
              opacity: this.currentStepIndex === 0 ? 0.4 : 1,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '11px', opacity: 0.5, alignSelf: 'center' }}>
            Step {this.currentStepIndex + 1} of {this.totalSteps}
          </span>
          <button
            onClick={() => this.handleNext()}
            style={{
              padding: '6px 16px', borderRadius: '4px', border: 'none',
              background: 'var(--theia-button-background)',
              color: 'var(--theia-button-foreground)',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            }}
          >
            {this.currentStepIndex >= this.totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    );
  }

  private renderField(field: WizardField, value: string | number | boolean | string[]): React.ReactElement {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      padding: '6px 8px',
      borderRadius: '4px',
      border: '1px solid var(--theia-border-color)',
      background: 'var(--theia-input-background)',
      color: 'var(--theia-foreground)',
      fontSize: '12px',
    };

    switch (field.type) {
      case 'select':
        return (
          <select
            value={String(value)}
            onChange={e => this.handleFieldChange(field.id, e.target.value)}
            style={baseStyle}
          >
            {(field.options ?? []).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      case 'multiselect': {
        const selected = (Array.isArray(value) ? value : []) as string[];
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(field.options ?? []).map(o => {
              const isSelected = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() => {
                    const next = isSelected ? selected.filter(v => v !== o.value) : [...selected, o.value];
                    this.handleFieldChange(field.id, next);
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: '4px',
                    border: `1px solid ${isSelected ? 'var(--theia-button-background)' : 'var(--theia-border-color)'}`,
                    background: isSelected ? 'var(--theia-button-background)' : 'transparent',
                    color: isSelected ? 'var(--theia-button-foreground)' : 'var(--theia-foreground)',
                    cursor: 'pointer', fontSize: '11px',
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        );
      }
      case 'toggle':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={e => this.handleFieldChange(field.id, e.target.checked)}
              style={{ accentColor: 'var(--theia-button-background)' }}
            />
            <span style={{ fontSize: '12px' }}>{value ? 'Enabled' : 'Disabled'}</span>
          </label>
        );
      case 'slider': {
        const numVal = Number(value);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={numVal}
              onChange={e => this.handleFieldChange(field.id, Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--theia-button-background)' }}
            />
            <span style={{ fontSize: '11px', minWidth: '30px', textAlign: 'right', opacity: 0.7 }}>{numVal.toFixed(1)}</span>
          </div>
        );
      }
      case 'number':
        return (
          <input
            type="number"
            value={Number(value)}
            onChange={e => this.handleFieldChange(field.id, Number(e.target.value))}
            style={baseStyle}
          />
        );
      default:
        return (
          <input
            type="text"
            value={String(value)}
            onChange={e => this.handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={baseStyle}
          />
        );
    }
  }

  private renderSummary(): React.ReactElement {
    if (!this.summary) return <div />;
    const summary = this.summary!;
    const profile = PROFILES.find(p => p.id === summary.profile);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span className="codicon codicon-check" style={{ fontSize: '18px', color: 'var(--theia-successForeground)' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Setup Complete</h2>
        </div>

        <div style={{
          padding: '16px', borderRadius: '6px',
          border: '1px solid var(--theia-border-color)',
          background: 'var(--theia-sideBar-background)',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', fontSize: '12px' }}>
            <span style={{ opacity: 0.6 }}>Profile:</span>
            <span style={{ fontWeight: 600 }}>{profile?.label ?? this.summary.profile} — {profile?.description ?? ''}</span>
            <span style={{ opacity: 0.6 }}>Autonomy:</span>
            <span style={{ fontWeight: 600 }}>{this.summary.autonomyLevel}</span>
            <span style={{ opacity: 0.6 }}>Steps completed:</span>
            <span style={{ fontWeight: 600 }}>{this.summary.completedSteps} / {this.summary.totalSteps}</span>
            <span style={{ opacity: 0.6 }}>Duration:</span>
            <span style={{ fontWeight: 600 }}>{Math.round(this.summary.duration / 1000)}s</span>
          </div>
        </div>

        <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px 0' }}>Generated Configuration</h3>
        <pre style={{
          padding: '12px', borderRadius: '6px',
          background: 'var(--theia-editor-background)',
          border: '1px solid var(--theia-border-color)',
          fontSize: '11px', overflow: 'auto', maxHeight: '200px',
          fontFamily: 'var(--theia-monospace-fontFamily)',
          marginBottom: '16px',
        }}>
          {JSON.stringify(this.summary.config, null, 2)}
        </pre>

        <button
          onClick={() => this.handleRestart()}
          style={{
            padding: '6px 16px', borderRadius: '4px',
            border: '1px solid var(--theia-border-color)',
            background: 'transparent', color: 'var(--theia-foreground)',
            cursor: 'pointer', fontSize: '12px', fontWeight: 600,
          }}
        >
          Restart Wizard
        </button>
      </div>
    );
  }
}
