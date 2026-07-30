import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_CONTROL_TOWER_SERVICE, IDEIA_ControlTowerService } from '../common/ideia-protocol';
import { ErrorBoundary } from './ideia-error-boundary';

const AUTONOMY_LEVELS = ['N0', 'N1', 'N2', 'N3', 'N4'];

interface BreakerInfo {
  type: string;
  tripped: boolean;
  currentValue: number;
  threshold: number;
  action: string;
}

interface LayerInfo {
  layer: string;
  status: string;
  enabled: boolean;
}

interface DecisionInfo {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  approved: boolean;
}

interface SafetyStatus {
  mode: string;
  activeTriggers: number;
  breakers: BreakerInfo[];
  layers: LayerInfo[];
  decisions: DecisionInfo[];
}

@injectable()
export class IDEIA_ControlTowerWidget extends BaseWidget {
  static ID = 'ideia:control-tower';
  static LABEL = 'Control Tower';

  private root: Root | undefined;
  private currentLevel = 'N2';
  private emergencyBrakeActive = false;
  private systemHealth = { agents: 0, tasksInQueue: 0, recentErrors: 0, uptime: 0 };
  private safetyStatus: SafetyStatus = { mode: 'normal', activeTriggers: 0, breakers: [], layers: [], decisions: [] };
  private activeTab: 'overview' | 'safety' | 'breakers' | 'decisions' = 'overview';

  constructor(
    @inject(IDEIA_CONTROL_TOWER_SERVICE) private controlTowerService: IDEIA_ControlTowerService,
  ) {
    super();
    this.id = IDEIA_ControlTowerWidget.ID;
    this.title.label = IDEIA_ControlTowerWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-dashboard';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  protected override onAfterAttach(): void {
    this.render();
  }

  private render(): void {
    if (!this.root) this.root = createRoot(this.node);
    this.root.render(<ErrorBoundary><ControlTowerPanel
      currentLevel={this.currentLevel}
      emergencyBrakeActive={this.emergencyBrakeActive}
      systemHealth={this.systemHealth}
      safetyStatus={this.safetyStatus}
      activeTab={this.activeTab}
      onLevelChange={level => { this.currentLevel = level; this.render(); }}
      onEmergencyBrake={() => { this.emergencyBrakeActive = !this.emergencyBrakeActive; this.render(); }}
      onTabChange={tab => { this.activeTab = tab; this.render(); }}
    /></ErrorBoundary>);
  }

  override dispose(): void {
    this.root?.unmount();
    super.dispose();
  }
}

function ControlTowerPanel({ currentLevel, emergencyBrakeActive, systemHealth, safetyStatus, activeTab, onLevelChange, onEmergencyBrake, onTabChange }: {
  currentLevel: string;
  emergencyBrakeActive: boolean;
  systemHealth: { agents: number; tasksInQueue: number; recentErrors: number; uptime: number };
  safetyStatus: SafetyStatus;
  activeTab: string;
  onLevelChange: (level: string) => void;
  onEmergencyBrake: () => void;
  onTabChange: (tab: 'overview' | 'safety' | 'breakers' | 'decisions') => void;
}): React.ReactElement {
  const tabs = ['overview', 'safety', 'breakers', 'decisions'] as const;
  return (
    <div style={{ padding: '12px', fontFamily: 'var(--theia-ui-font-family)' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Control Tower</h2>

      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => onTabChange(tab)}
            style={{
              flex: 1, padding: '4px 8px', cursor: 'pointer', border: 'none', borderRadius: '3px',
              fontSize: '11px', fontWeight: activeTab === tab ? 700 : 400,
              background: activeTab === tab ? 'var(--theia-activityBar-activeBorder)' : 'var(--theia-list-hoverBackground)',
              color: activeTab === tab ? 'var(--theia-activityBar-activeForeground)' : 'var(--theia-foreground)',
              textTransform: 'capitalize',
            }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '6px' }}>Autonomy Level</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {AUTONOMY_LEVELS.map(level => (
                <button key={level} onClick={() => onLevelChange(level)}
                  aria-label={`Set autonomy level to ${level}`}
                  aria-pressed={currentLevel === level}
                  style={{
                    flex: 1, padding: '6px 0', cursor: 'pointer', border: 'none', borderRadius: '4px', fontSize: '12px',
                    fontWeight: currentLevel === level ? 700 : 400,
                    background: currentLevel === level ? 'var(--theia-activityBar-activeBorder)' : 'var(--theia-list-hoverBackground)',
                    color: currentLevel === level ? 'var(--theia-activityBar-activeForeground)' : 'var(--theia-foreground)',
                  }}>{level}</button>
              ))}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>Current: {currentLevel}</div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '6px' }}>System Health</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { label: 'Active Agents', value: systemHealth.agents },
                { label: 'Tasks in Queue', value: systemHealth.tasksInQueue },
                { label: 'Recent Errors', value: systemHealth.recentErrors, warn: systemHealth.recentErrors > 0 },
              ].map(item => (
                <div key={item.label} style={{ padding: '8px', borderRadius: '4px', background: 'var(--theia-list-hoverBackground)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: item.warn ? '#ef4444' : undefined }}>{item.value}</div>
                  <div style={{ fontSize: '10px', opacity: 0.6 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '6px' }}>Safety Mode</div>
            <div style={{
              padding: '8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600,
              background: safetyStatus.mode === 'normal' ? 'var(--theia-list-hoverBackground)' :
                safetyStatus.mode === 'paused' ? '#fef3c7' : '#fee2e2',
              color: safetyStatus.mode === 'normal' ? 'var(--theia-foreground)' :
                safetyStatus.mode === 'paused' ? '#92400e' : '#991b1b',
            }}>
              {safetyStatus.mode.toUpperCase()}{safetyStatus.activeTriggers > 0 ? ` (${safetyStatus.activeTriggers} triggers)` : ''}
            </div>
          </div>

          <button onClick={onEmergencyBrake}
            aria-label={emergencyBrakeActive ? 'Release emergency brake' : 'Activate emergency brake'}
            aria-pressed={emergencyBrakeActive}
            style={{
              width: '100%', padding: '10px', cursor: 'pointer', border: 'none', borderRadius: '4px',
              fontSize: '14px', fontWeight: 700,
              background: emergencyBrakeActive ? '#dc2626' : '#991b1b',
              color: '#fff',
            }}>
            {emergencyBrakeActive ? 'E-STOP ACTIVE — Click to release' : 'EMERGENCY BRAKE (E-Stop)'}
          </button>
        </>
      )}

      {activeTab === 'safety' && (
        <div>
          <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '6px' }}>7-Layer Safety Architecture</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {safetyStatus.layers.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
                No layer data available. Run safety initialization.
              </div>
            )}
            {safetyStatus.layers.map(layer => (
              <div key={layer.layer} style={{
                padding: '6px 8px', borderRadius: '4px', fontSize: '11px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: layer.status === 'healthy' ? 'var(--theia-list-hoverBackground)' :
                  layer.status === 'degraded' ? '#fef3c7' : '#fee2e2',
              }}>
                <span style={{ fontWeight: 500 }}>{layer.layer}</span>
                <span style={{
                  fontWeight: 600,
                  color: layer.status === 'healthy' ? '#16a34a' : layer.status === 'degraded' ? '#d97706' : '#dc2626',
                }}>
                  {layer.status}{!layer.enabled ? ' (disabled)' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'breakers' && (
        <div>
          <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '6px' }}>Circuit Breakers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {safetyStatus.breakers.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
                No breaker data available.
              </div>
            )}
            {safetyStatus.breakers.map(breaker => (
              <div key={breaker.type} style={{
                padding: '6px 8px', borderRadius: '4px', fontSize: '11px',
                background: breaker.tripped ? '#fee2e2' : 'var(--theia-list-hoverBackground)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                  <span>{breaker.type}</span>
                  <span style={{ color: breaker.tripped ? '#dc2626' : '#16a34a' }}>
                    {breaker.tripped ? 'TRIPPED' : 'OK'}
                  </span>
                </div>
                <div style={{ opacity: 0.6, fontSize: '10px', marginTop: '2px' }}>
                  {breaker.currentValue}/{breaker.threshold} — action: {breaker.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'decisions' && (
        <div>
          <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '6px' }}>Decision Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {safetyStatus.decisions.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
                No decisions logged yet.
              </div>
            )}
            {safetyStatus.decisions.slice(0, 20).map(d => (
              <div key={d.id} style={{
                padding: '5px 8px', borderRadius: '3px', fontSize: '10px',
                background: 'var(--theia-list-hoverBackground)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{d.action}</span>
                  <span style={{ opacity: 0.5 }}>{new Date(d.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ opacity: 0.7, marginTop: '2px' }}>{d.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
