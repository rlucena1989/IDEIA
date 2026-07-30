import * as React from 'react';

export type EmptyStatePreset = 'noResults' | 'noConfig' | 'noAgents' | 'noData' | 'error';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: string;
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: string;
  actions?: EmptyStateAction[];
  compact?: boolean;
  preset?: EmptyStatePreset;
  actionLabel?: string;
  onAction?: () => void;
}

const PRESETS: Record<EmptyStatePreset, { title: string; description: string; icon: string }> = {
  noResults: { title: 'Nenhum resultado encontrado', description: 'Try adjusting your search or filters.', icon: 'search' },
  noConfig: { title: 'No configuration', description: 'No configuration available for this section.', icon: 'settings' },
  noAgents: { title: 'No agents', description: 'No agents are currently registered.', icon: 'agent' },
  noData: { title: 'No data', description: 'There is no data to display.', icon: 'empty' },
  error: { title: 'Error loading data', description: 'Something went wrong. Try again.', icon: 'alert' },
};

const iconMap: Record<string, string> = {
  dashboard: '\u{1F4CA}',
  agent: '\u{1F916}',
  search: '\u{1F50D}',
  chat: '\u{1F4AC}',
  file: '\u{1F4C4}',
  security: '\u{1F512}',
  settings: '\u2699\uFE0F',
  star: '\u2B50',
  alert: '\u26A0\uFE0F',
  check: '\u2705',
  empty: '\u{1F4ED}',
};

function getPresetData(props: EmptyStateProps): { title: string; description: string; icon: string } {
  if (props.preset && !props.title) {
    return PRESETS[props.preset];
  }
  return { title: props.title || '', description: props.description || '', icon: props.icon || 'empty' };
}

function getIconContent(icon: string): React.ReactElement {
  const emoji = iconMap[icon];
  return <span className={`codicon codicon-${icon}`}>{emoji || ''}</span>;
}

export function IDEIA_EmptyState(props: EmptyStateProps): React.ReactElement {
  const { title, description, icon, actions, actionLabel, onAction, compact } = props;
  const presetData = getPresetData(props);
  const displayTitle = title || presetData.title;
  const displayDescription = description || presetData.description;
  const displayIcon = icon || presetData.icon;

  const style: React.CSSProperties = compact
    ? { padding: '16px', textAlign: 'center' as const }
    : { padding: '40px 20px', textAlign: 'center' as const };

  return (
    <div style={style} role="status" aria-live="polite" aria-label={displayTitle}>
      {displayIcon && (
        <div style={{ fontSize: compact ? '28px' : '48px', marginBottom: '8px', opacity: 0.6 }} aria-hidden="true">
          {getIconContent(displayIcon)}
        </div>
      )}
      <h3 style={{
        margin: '0 0 8px', fontSize: compact ? '14px' : '16px',
        fontWeight: 600, color: 'var(--theia-foreground)',
      }}>{displayTitle}</h3>
      {displayDescription && (
        <p style={{
          margin: '0 0 16px', fontSize: compact ? '12px' : '13px',
          opacity: 0.7, color: 'var(--theia-foreground)',
        }}>{displayDescription}</p>
      )}
      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              title={action.label}
              style={{
                padding: '6px 16px', cursor: 'pointer',
                border: '1px solid var(--theia-button-border, var(--theia-foreground))',
                borderRadius: '4px', fontSize: '12px',
                background: 'var(--theia-button-background)',
                color: 'var(--theia-button-foreground)',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          title={actionLabel}
          style={{
            padding: '6px 16px', cursor: 'pointer',
            border: '1px solid var(--theia-button-border, var(--theia-foreground))',
            borderRadius: '4px', fontSize: '12px',
            background: 'var(--theia-button-background)',
            color: 'var(--theia-button-foreground)',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState(props: EmptyStateProps): React.ReactElement {
  return <IDEIA_EmptyState {...props} />;
}

export function createEmptyStateAction(label: string, onClick: () => void, icon?: string): EmptyStateAction {
  return { label, onClick, icon };
}
