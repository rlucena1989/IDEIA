# Estudo de Intensifica√ß√£o ‚Äî Deep Dives T√©cnicos

> **Prop√≥sito:** Adicionar profundidade t√©cnica significativa aos estudos da IDEIA que
> pontuaram mais baixo na dimens√£o "Profundidade T√©cnica" da auditoria de qualidade.
> Cada se√ß√£o √© um mergulho t√©cnico completo com c√≥digo, diagramas, algoritmos e
> detalhes de implementa√ß√£o prontos para uso.

---

## √çndice

1. [UX Deep Dive](#1-ux-deep-dive)
2. [Plano de Implementa√ß√£o Deep Dive](#2-plano-de-implementa√ß√£o-deep-dive)
3. [Desktop Native Deep Dive](#3-desktop-native-deep-dive)
4. [Matriz Tecnol√≥gica Deep Dive](#4-matriz-tecnol√≥gica-deep-dive)

---

## 1. UX Deep Dive

> **Intensifica:** `ESTUDO-UX-EXPERIENCIA-USUARIO.md`
> **Foco:** Componentes React/TypeScript completos para feedback de agente,
> implementa√ß√£o de performance budget, acessibilidade e micro-intera√ß√µes.

### 1.1 Agent Feedback UI Components

#### `AgentProgressIndicator.tsx`

```tsx
import React, { useEffect, useReducer, useRef } from 'react';

type AgentStage =
  | 'analysing'
  | 'planning'
  | 'coding'
  | 'reviewing'
  | 'testing'
  | 'delivering';

interface AgentProgressState {
  stage: AgentStage;
  progress: number;
  startedAt: number;
  eta: number | null;
  statusMessage: string;
  substeps: Array<{ label: string; done: boolean }>;
  error: string | null;
}

type AgentProgressAction =
  | { type: 'SET_STAGE'; stage: AgentStage }
  | { type: 'SET_PROGRESS'; progress: number }
  | { type: 'SET_ETA'; eta: number }
  | { type: 'SET_STATUS'; message: string }
  | { type: 'ADD_SUBSTEP'; label: string }
  | { type: 'COMPLETE_SUBSTEP'; index: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

function agentProgressReducer(
  state: AgentProgressState,
  action: AgentProgressAction
): AgentProgressState {
  switch (action.type) {
    case 'SET_STAGE':
      return { ...state, stage: action.stage, progress: 0, error: null };
    case 'SET_PROGRESS':
      return { ...state, progress: Math.min(action.progress, 100) };
    case 'SET_ETA':
      return { ...state, eta: action.eta };
    case 'SET_STATUS':
      return { ...state, statusMessage: action.message };
    case 'ADD_SUBSTEP':
      return {
        ...state,
        substeps: [...state.substeps, { label: action.label, done: false }],
      };
    case 'COMPLETE_SUBSTEP':
      return {
        ...state,
        substeps: state.substeps.map((s, i) =>
          i === action.index ? { ...s, done: true } : s
        ),
      };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return createInitialProgressState();
    default:
      return state;
  }
}

function createInitialProgressState(): AgentProgressState {
  return {
    stage: 'analysing',
    progress: 0,
    startedAt: Date.now(),
    eta: null,
    statusMessage: 'Analisando requisitos...',
    substeps: [],
    error: null,
  };
}

interface AgentProgressIndicatorProps {
  agentName: string;
  autonomyLevel: number;
  onCancel?: () => void;
}

const stageLabels: Record<AgentStage, string> = {
  analysing: 'Analisando',
  planning: 'Planejando',
  coding: 'Codificando',
  reviewing: 'Revisando',
  testing: 'Testando',
  delivering: 'Entregando',
};

const stageOrder: AgentStage[] = [
  'analysing',
  'planning',
  'coding',
  'reviewing',
  'testing',
  'delivering',
];

function formatEta(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function AgentProgressIndicator({
  agentName,
  autonomyLevel,
  onCancel,
}: AgentProgressIndicatorProps) {
  const [state, dispatch] = useReducer(
    agentProgressReducer,
    undefined,
    createInitialProgressState
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - state.startedAt;
      const estimated = state.eta ? state.eta - elapsed : null;
      if (estimated !== null && estimated > 0) {
        dispatch({ type: 'SET_ETA', eta: estimated });
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.startedAt, state.eta]);

  const currentIndex = stageOrder.indexOf(state.stage);
  const isCompleted = state.stage === 'delivering' && state.progress >= 100;

  return (
    <div
      className="agent-progress-indicator"
      role="region"
      aria-label={`Progresso do agente ${agentName}`}
      aria-live="polite"
    >
      <div className="agent-progress-header">
        <span className="agent-name">{agentName}</span>
        <AutonomyLevelBadge level={autonomyLevel} />
        {onCancel && !isCompleted && (
          <button
            className="agent-cancel-btn"
            onClick={onCancel}
            aria-label="Cancelar opera√ß√£o do agente"
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="agent-progress-stages">
        {stageOrder.map((stage, index) => {
          const isActive = index === currentIndex;
          const isPast = index < currentIndex;
          return (
            <div
              key={stage}
              className={`stage-indicator ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`}
            >
              <div className="stage-dot">
                {isPast ? '\u2713' : isActive ? '\u25C9' : '\u25CB'}
              </div>
              <div className="stage-label">{stageLabels[stage]}</div>
            </div>
          );
        })}
      </div>

      <div className="agent-progress-bar-container">
        <div
          className="agent-progress-bar"
          role="progressbar"
          aria-valuenow={state.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso: ${state.progress}%`}
        >
          <div
            className="agent-progress-fill"
            style={{ width: `${state.progress}%` }}
          >
            {state.progress > 10 && (
              <span className="progress-text">{state.progress}%</span>
            )}
          </div>
        </div>
      </div>

      <div className="agent-progress-message">
        <span className="status-text">{state.statusMessage}</span>
        {state.eta !== null && state.eta > 0 && (
          <span className="eta-text">ETA: {formatEta(state.eta)}</span>
        )}
      </div>

      {state.substeps.length > 0 && (
        <div className="agent-substeps" role="list" aria-label="Subpassos">
          {state.substeps.map((substep, index) => (
            <div
              key={index}
              className={`substep ${substep.done ? 'done' : ''}`}
              role="listitem"
            >
              <span className="substep-icon">
                {substep.done ? '\u2713' : '\u25CB'}
              </span>
              <span className="substep-label">{substep.label}</span>
            </div>
          ))}
        </div>
      )}

      {state.error && (
        <div className="agent-error" role="alert">
          <span className="error-icon">{'\u2715'}</span>
          <span className="error-message">{state.error}</span>
        </div>
      )}
    </div>
  );
}

function AutonomyLevelBadge({ level }: { level: number }) {
  const levels = ['N0', 'N1', 'N2', 'N3', 'N4'];
  const colors = ['#94a3b8', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];
  const descriptions = [
    'Assistido',
    'Supervisionado',
    'Semi-aut√¥nomo',
    'Aut√¥nomo',
    'Total',
  ];

  return (
    <span
      className="autonomy-badge"
      style={{
        backgroundColor: colors[level] ?? colors[0],
      }}
      title={descriptions[level] ?? ''}
      aria-label={`N√≠vel de autonomia ${level}: ${descriptions[level]}`}
    >
      {levels[level] ?? 'N0'}
    </span>
  );
}
```

#### `AgentDecisionDialog.tsx`

```tsx
import React, { useEffect, useRef, useCallback } from 'react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

interface DecisionOption {
  id: string;
  label: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedEffort: string;
}

interface AgentDecisionDialogProps {
  open: boolean;
  title: string;
  description: string;
  diff?: DiffLine[];
  options?: DecisionOption[];
  selectedOptionId?: string;
  onApprove: (optionId?: string) => void;
  onReject: (reason: string) => void;
  onModify: () => void;
  onClose: () => void;
}

export function AgentDecisionDialog({
  open,
  title,
  description,
  diff,
  options,
  selectedOptionId,
  onApprove,
  onReject,
  onModify,
  onClose,
}: AgentDecisionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null);
  const [selected, setSelected] = React.useState(selectedOptionId ?? '');
  const [showRejectForm, setShowRejectForm] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        onApprove(selected || undefined);
      }
    },
    [open, onClose, onApprove, selected]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (open && dialogRef.current) {
      const focusable = dialogRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, [open]);

  if (!open) return null;

  const diffColors: Record<string, string> = {
    added: '#166534',
    removed: '#991b1b',
    unchanged: 'transparent',
  };

  const impactColors: Record<string, string> = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#ef4444',
  };

  return (
    <div
      className="decision-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-title"
      aria-describedby="decision-desc"
    >
      <div className="decision-dialog" ref={dialogRef}>
        <div className="decision-header">
          <h2 id="decision-title">{title}</h2>
          <button
            className="decision-close"
            onClick={onClose}
            aria-label="Fechar di√°logo"
          >
            {'\u2715'}
          </button>
        </div>

        <p id="decision-desc" className="decision-description">
          {description}
        </p>

        {diff && diff.length > 0 && (
          <div className="decision-diff" role="region" aria-label="Diff de altera√ß√µes">
            <table className="diff-table">
              <thead>
                <tr>
                  <th className="diff-linenum">#</th>
                  <th className="diff-content">Conte√∫do</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((line, index) => (
                  <tr
                    key={index}
                    className={`diff-line diff-${line.type}`}
                    style={{
                      backgroundColor: diffColors[line.type],
                    }}
                  >
                    <td className="diff-linenum">{line.lineNumber}</td>
                    <td className="diff-content">
                      <code>{line.content}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {options && options.length > 0 && (
          <div
            className="decision-options"
            role="radiogroup"
            aria-label="Op√ß√µes de decis√£o"
          >
            {options.map((opt) => (
              <label
                key={opt.id}
                className={`option-card ${selected === opt.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="decision-option"
                  value={opt.id}
                  checked={selected === opt.id}
                  onChange={() => setSelected(opt.id)}
                />
                <div className="option-content">
                  <div className="option-header">
                    <span className="option-label">{opt.label}</span>
                    <span
                      className="option-impact"
                      style={{ color: impactColors[opt.impact] }}
                    >
                      {opt.impact}
                    </span>
                  </div>
                  <p className="option-desc">{opt.description}</p>
                  <span className="option-effort">
                    Esfor√ßo estimado: {opt.estimatedEffort}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}

        {showRejectForm ? (
          <div className="reject-form">
            <label htmlFor="reject-reason">
              Motivo da rejei√ß√£o (obrigat√≥rio):
            </label>
            <textarea
              id="reject-reason"
              ref={rejectReasonRef}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Descreva por que esta decis√£o precisa ser modificada..."
              aria-required="true"
            />
            <div className="reject-actions">
              <button
                onClick={() => setShowRejectForm(false)}
                className="btn-secondary"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (rejectReason.trim()) {
                    onReject(rejectReason.trim());
                    setShowRejectForm(false);
                    setRejectReason('');
                  }
                }}
                className="btn-danger"
                disabled={!rejectReason.trim()}
              >
                Rejeitar
              </button>
            </div>
          </div>
        ) : (
          <div className="decision-actions">
            <button
              onClick={() => setShowRejectForm(true)}
              className="btn-secondary"
            >
              Rejeitar
            </button>
            <button onClick={onModify} className="btn-secondary">
              Modificar
            </button>
            <button
              onClick={() => onApprove(selected || undefined)}
              className="btn-primary"
            >
              Aprovar {options ? `(${selected})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### `AgentSuggestionBanner.tsx`

```tsx
import React, { useState, useEffect, useCallback } from 'react';

interface SuggestionAction {
  label: string;
  handler: () => void;
  primary?: boolean;
}

interface AgentSuggestionBannerProps {
  suggestionId: string;
  title: string;
  description: string;
  category: 'optimization' | 'refactor' | 'security' | 'ux' | 'performance';
  confidence: number;
  actions: SuggestionAction[];
  dismissible?: boolean;
  timeout?: number;
  onDismiss?: (id: string) => void;
  onFeedback?: (id: string, helpful: boolean) => void;
}

const categoryIcons: Record<string, string> = {
  optimization: '\u26A1',
  refactor: '\uD83D\uDD27',
  security: '\uD83D\uDD12',
  ux: '\uD83C\uDFA8',
  performance: '\uD83D\uDE80',
};

const categoryLabels: Record<string, string> = {
  optimization: 'Otimiza√ß√£o',
  refactor: 'Refatora√ß√£o',
  security: 'Seguran√ßa',
  ux: 'Experi√™ncia do Usu√°rio',
  performance: 'Performance',
};

export function AgentSuggestionBanner({
  suggestionId,
  title,
  description,
  category,
  confidence,
  actions,
  dismissible = true,
  timeout,
  onDismiss,
  onFeedback,
}: AgentSuggestionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not-helpful' | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timeout && timeout > 0) {
      const timer = setTimeout(() => {
        setDismissed(true);
        onDismiss?.(suggestionId);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [timeout, suggestionId, onDismiss]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.(suggestionId);
  }, [suggestionId, onDismiss]);

  const handleFeedback = useCallback(
    (helpful: boolean) => {
      setFeedbackGiven(helpful ? 'helpful' : 'not-helpful');
      onFeedback?.(suggestionId, helpful);
    },
    [suggestionId, onFeedback]
  );

  if (dismissed) return null;

  return (
    <div
      className={`agent-suggestion-banner ${isVisible ? 'visible' : ''} category-${category}`}
      role="complementary"
      aria-label={`Sugest√£o de ${categoryLabels[category]}`}
    >
      <div className="suggestion-icon" aria-hidden="true">
        {categoryIcons[category]}
      </div>

      <div className="suggestion-content">
        <div className="suggestion-header">
          <span className="suggestion-category">
            {categoryLabels[category]}
          </span>
          <span
            className="suggestion-confidence"
            title={`Confian√ßa: ${Math.round(confidence * 100)}%`}
          >
            <span
              className="confidence-bar"
              style={{ width: `${confidence * 100}%` }}
            />
            <span className="confidence-text">
              {Math.round(confidence * 100)}%
            </span>
          </span>
        </div>
        <strong className="suggestion-title">{title}</strong>
        <p className="suggestion-description">{description}</p>

        <div className="suggestion-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              className={`suggestion-btn ${action.primary ? 'primary' : 'secondary'}`}
              onClick={action.handler}
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="suggestion-feedback">
          <span className="feedback-label">√ötil?</span>
          <button
            className={`feedback-btn ${feedbackGiven === 'helpful' ? 'active' : ''}`}
            onClick={() => handleFeedback(true)}
            aria-label="Marcar como √∫til"
            disabled={feedbackGiven !== null}
          >
            {'\uD83D\uDC4D'}
          </button>
          <button
            className={`feedback-btn ${feedbackGiven === 'not-helpful' ? 'active' : ''}`}
            onClick={() => handleFeedback(false)}
            aria-label="Marcar como n√£o √∫til"
            disabled={feedbackGiven !== null}
          >
            {'\uD83D\uDC4E'}
          </button>
        </div>
      </div>

      {dismissible && (
        <button
          className="suggestion-dismiss"
          onClick={handleDismiss}
          aria-label="Dispensar sugest√£o"
        >
          {'\u2715'}
        </button>
      )}
    </div>
  );
}
```

#### `AutonomyLevelIndicator.tsx`

```tsx
import React from 'react';

interface AutonomyLevelIndicatorProps {
  currentLevel: number;
  availableLevels?: number[];
  onLevelChange?: (level: number) => void;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const autonomyConfig = [
  {
    level: 0,
    label: 'N0 - Assistido',
    shortLabel: 'N0',
    color: '#94a3b8',
    description:
      'Agente sugere, humano aprova cada a√ß√£o. M√°ximo controle, m√≠nimo risco.',
    capabilities: [
      'Apenas sugest√µes',
      'Humano executa',
      'Zero autonomia',
    ],
  },
  {
    level: 1,
    label: 'N1 - Supervisionado',
    shortLabel: 'N1',
    color: '#22c55e',
    description:
      'Agente executa, humano supervisiona. Aprova√ß√£o expl√≠cita em decis√µes cr√≠ticas.',
    capabilities: [
      'Execu√ß√£o supervisionada',
      'Aprova√ß√£o em checkpoints',
      'Rollback manual',
    ],
  },
  {
    level: 2,
    label: 'N2 - Semi-aut√¥nomo',
    shortLabel: 'N2',
    color: '#3b82f6',
    description:
      'Agente executa e decide em escopo definido. Humano define objetivos.',
    capabilities: [
      'Decis√µes no escopo',
      'Notifica√ß√£o de resultados',
      'Escalation autom√°tico',
    ],
  },
  {
    level: 3,
    label: 'N3 - Aut√¥nomo',
    shortLabel: 'N3',
    color: '#a855f7',
    description:
      'Agente planeja e executa. Humano revisa entregas. Auto-corre√ß√£o ativa.',
    capabilities: [
      'Planejamento pr√≥prio',
      'Execu√ß√£o aut√¥noma',
      'Auto-corre√ß√£o',
      'Relat√≥rios autom√°ticos',
    ],
  },
  {
    level: 4,
    label: 'N4 - Total',
    shortLabel: 'N4',
    color: '#f59e0b',
    description:
      'Agente opera independentemente. Humano define miss√£o, agente define estrat√©gia.',
    capabilities: [
      'Autonomia total',
      'Estrat√©gia pr√≥pria',
      'Cross-m√≥dulo',
      'Delegation',
    ],
  },
];

export function AutonomyLevelIndicator({
  currentLevel,
  availableLevels,
  onLevelChange,
  showDescription = true,
  size = 'md',
}: AutonomyLevelIndicatorProps) {
  const config = autonomyConfig[currentLevel] ?? autonomyConfig[0];
  const levels = availableLevels ?? [0, 1, 2, 3, 4];

  const sizeMap = {
    sm: { badge: '24px', fontSize: '12px', iconSize: '14px' },
    md: { badge: '32px', fontSize: '14px', iconSize: '18px' },
    lg: { badge: '40px', fontSize: '16px', iconSize: '22px' },
  };

  const sizeStyle = sizeMap[size];

  return (
    <div
      className="autonomy-level-indicator"
      role="region"
      aria-label={`N√≠vel de autonomia: ${config.label}`}
    >
      <div className="autonomy-badge-container">
        <div
          className="autonomy-badge"
          style={{
            width: sizeStyle.badge,
            height: sizeStyle.badge,
            backgroundColor: config.color,
            fontSize: sizeStyle.iconSize,
          }}
          title={config.label}
        >
          {config.shortLabel}
        </div>
        {onLevelChange && (
          <div className="autonomy-selector" role="radiogroup" aria-label="Selecionar n√≠vel de autonomia">
            {levels.map((level) => {
              const cfg = autonomyConfig[level];
              return (
                <button
                  key={level}
                  className={`level-dot ${level === currentLevel ? 'active' : ''}`}
                  style={{
                    backgroundColor:
                      level === currentLevel ? cfg.color : '#374151',
                  }}
                  onClick={() => onLevelChange(level)}
                  role="radio"
                  aria-checked={level === currentLevel}
                  aria-label={`N√≠vel ${level}: ${cfg.label}`}
                  title={cfg.label}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="autonomy-info">
        <span
          className="autonomy-label"
          style={{ fontSize: sizeStyle.fontSize, color: config.color }}
        >
          {config.label}
        </span>
        {showDescription && (
          <p className="autonomy-description" style={{ fontSize: sizeStyle.fontSize }}>
            {config.description}
          </p>
        )}
      </div>

      <div className="autonomy-capabilities">
        {config.capabilities.map((cap, index) => (
          <span key={index} className="capability-tag">
            {cap}
          </span>
        ))}
      </div>
    </div>
  );
}
```

#### CSS para Todos os Componentes

```css
/* AgentProgressIndicator */
.agent-progress-indicator {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px;
  font-family: 'Inter', system-ui, sans-serif;
  color: #e2e8f0;
  max-width: 600px;
}

.agent-progress-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.agent-name {
  font-weight: 600;
  font-size: 16px;
}

.agent-progress-stages {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  position: relative;
}

.agent-progress-stages::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 24px;
  right: 24px;
  height: 2px;
  background: #334155;
  z-index: 0;
}

.stage-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 1;
}

.stage-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: #1e293b;
  border: 2px solid #334155;
  transition: all 0.3s ease;
}

.stage-indicator.active .stage-dot {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
  animation: pulse-dot 2s infinite;
}

.stage-indicator.completed .stage-dot {
  border-color: #22c55e;
  background: #22c55e;
  color: white;
}

.stage-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stage-indicator.active .stage-label {
  color: #93c5fd;
  font-weight: 600;
}

.agent-progress-bar {
  height: 8px;
  background: #334155;
  border-radius: 4px;
  overflow: hidden;
}

.agent-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

.progress-text {
  font-size: 10px;
  color: white;
  padding-right: 6px;
  font-weight: 600;
}

.agent-progress-message {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-text {
  font-size: 13px;
  color: #94a3b8;
}

.eta-text {
  font-size: 12px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
}

.agent-substeps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  border-top: 1px solid #334155;
  padding-top: 12px;
}

.substep {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  transition: all 0.3s ease;
}

.substep.done {
  color: #22c55e;
}

.agent-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
}

.error-message {
  color: #fca5a5;
  font-size: 13px;
}

@keyframes pulse-dot {
  0%, 100% {
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
  }
}

/* DecisionDialog */
.decision-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.2s ease;
}

.decision-dialog {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 28px;
  max-width: 720px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  animation: slide-up 0.25s ease;
}

.decision-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.decision-header h2 {
  margin: 0;
  font-size: 20px;
  color: #f1f5f9;
}

.decision-close {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  line-height: 1;
}

.decision-close:hover {
  color: #e2e8f0;
}

.decision-description {
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.decision-diff {
  margin-bottom: 20px;
  border: 1px solid #334155;
  border-radius: 8px;
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.diff-table th {
  padding: 8px 12px;
  text-align: left;
  background: #0f172a;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.diff-linenum {
  width: 48px;
  color: #64748b;
  text-align: right;
  padding: 4px 12px;
  user-select: none;
}

.diff-content {
  padding: 4px 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-content code {
  color: #e2e8f0;
}

.decision-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.option-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid #334155;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.option-card:hover {
  border-color: #475569;
  background: rgba(59, 130, 246, 0.05);
}

.option-card.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.option-card input[type='radio'] {
  margin-top: 3px;
  accent-color: #3b82f6;
}

.option-label {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 14px;
}

.option-impact {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.option-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 4px 0;
}

.decision-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #334155;
}

.btn-primary {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  border-color: #64748b;
  color: #e2e8f0;
}

.btn-danger {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.reject-form {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #334155;
}

.reject-form label {
  display: block;
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 8px;
}

.reject-form textarea {
  width: 100%;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px;
  color: #e2e8f0;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.reject-form textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.reject-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* SuggestionBanner */
.agent-suggestion-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-left: 4px solid #3b82f6;
  border-radius: 10px;
  margin-bottom: 12px;
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.agent-suggestion-banner.visible {
  opacity: 1;
  transform: translateX(0);
}

.agent-suggestion-banner.category-optimization {
  border-left-color: #eab308;
}

.agent-suggestion-banner.category-refactor {
  border-left-color: #8b5cf6;
}

.agent-suggestion-banner.category-security {
  border-left-color: #ef4444;
}

.agent-suggestion-banner.category-ux {
  border-left-color: #22c55e;
}

.agent-suggestion-banner.category-performance {
  border-left-color: #f97316;
}

.suggestion-icon {
  font-size: 24px;
  line-height: 1;
  padding-top: 2px;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.suggestion-category {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
}

.suggestion-title {
  display: block;
  color: #f1f5f9;
  font-size: 14px;
  margin-bottom: 4px;
}

.suggestion-description {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0 0 12px;
}

.suggestion-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.suggestion-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.suggestion-btn.primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.suggestion-btn.primary:hover {
  background: #2563eb;
}

.suggestion-btn.secondary {
  background: transparent;
  border: 1px solid #475569;
  color: #94a3b8;
}

.suggestion-btn.secondary:hover {
  border-color: #64748b;
  color: #e2e8f0;
}

.suggestion-feedback {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid #334155;
}

.feedback-label {
  font-size: 11px;
  color: #475569;
  margin-right: 4px;
}

.feedback-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0.5;
  transition: all 0.15s ease;
}

.feedback-btn:hover:not(:disabled) {
  opacity: 1;
  background: #334155;
}

.feedback-btn.active {
  opacity: 1;
}

.feedback-btn:disabled {
  cursor: default;
}

.suggestion-dismiss {
  background: transparent;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  line-height: 1;
}

.suggestion-dismiss:hover {
  color: #94a3b8;
}

/* AutonomyLevelIndicator */
.autonomy-level-indicator {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
}

.autonomy-badge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.autonomy-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.5px;
  font-family: 'JetBrains Mono', monospace;
}

.autonomy-selector {
  display: flex;
  gap: 4px;
}

.level-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.level-dot.active {
  border-color: #e2e8f0;
  transform: scale(1.2);
}

.level-dot:hover {
  transform: scale(1.3);
}

.autonomy-info {
  flex: 1;
}

.autonomy-label {
  font-weight: 700;
}

.autonomy-description {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0;
  line-height: 1.4;
}

.autonomy-capabilities {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.capability-tag {
  font-size: 10px;
  color: #475569;
  background: #0f172a;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
```

### 1.2 Performance Budget Implementation

#### PerformanceObserver Setup

```typescript
interface CoreWebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

type VitalCallback = (metric: CoreWebVitalMetric) => void;

const vitalCallbacks: VitalCallback[] = [];

export function onCoreWebVital(callback: VitalCallback): () => void {
  vitalCallbacks.push(callback);
  return () => {
    const index = vitalCallbacks.indexOf(callback);
    if (index >= 0) vitalCallbacks.splice(index, 1);
  };
}

function reportMetric(metric: CoreWebVitalMetric): void {
  vitalCallbacks.forEach((cb) => cb(metric));
  if (process.env.NODE_ENV === 'production') {
    sendMetricToAnalytics(metric);
  }
}

function getRating(name: string, value: number): CoreWebVitalMetric['rating'] {
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    TTFB: { good: 800, poor: 1800 },
  };
  const t = thresholds[name];
  if (!t) return 'needs-improvement';
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

function sendMetricToAnalytics(metric: CoreWebVitalMetric): void {
  if (navigator.sendBeacon) {
    const payload = JSON.stringify({
      type: 'web-vital',
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: metric.timestamp,
      url: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 128),
    });
    navigator.sendBeacon('/api/analytics/vital', payload);
  }
}

export function initPerformanceObservers(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    console.warn('[IDEIA] PerformanceObserver n√£o suportado');
    return;
  }

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        reportMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: getRating('LCP', lastEntry.startTime),
          timestamp: Date.now(),
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    console.warn('[IDEIA] LCP observer failed:', e);
  }

  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        reportMetric({
          name: 'FID',
          value: fidEntry.processingStart - fidEntry.startTime,
          rating: getRating('FID', fidEntry.processingStart - fidEntry.startTime),
          timestamp: Date.now(),
        });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    console.warn('[IDEIA] FID observer failed:', e);
  }

  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const layoutShift = entry as LayoutShift;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      });
      reportMetric({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        timestamp: Date.now(),
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    console.warn('[IDEIA] CLS observer failed:', e);
  }

  try {
    const inpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const inpEntry = entry as PerformanceEventTiming;
        reportMetric({
          name: 'INP',
          value: inpEntry.duration,
          rating: getRating('INP', inpEntry.duration),
          timestamp: Date.now(),
        });
      });
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 0 });
  } catch (e) {
    console.warn('[IDEIA] INP observer failed:', e);
  }

  try {
    const ttfbObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const navEntry = entries[0] as PerformanceNavigationTiming;
        reportMetric({
          name: 'TTFB',
          value: navEntry.responseStart - navEntry.requestStart,
          rating: getRating('TTFB', navEntry.responseStart - navEntry.requestStart),
          timestamp: Date.now(),
        });
      }
    });
    ttfbObserver.observe({ type: 'navigation', buffered: true });
  } catch (e) {
    console.warn('[IDEIA] TTFB observer failed:', e);
  }
}
```

#### Lazy Loading Strategy

```typescript
// src/lib/performance/lazy-load.ts
import React, { Suspense, ComponentType, lazy } from 'react';

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  preloadDelay?: number;
  errorBoundary?: boolean;
}

const DefaultFallback = () => (
  <div
    className="lazy-fallback"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: '#64748b',
    }}
  >
    <div className="lazy-spinner" aria-label="Carregando..." />
  </div>
);

export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn);

  const LazyLoaded = (props: React.ComponentProps<T>) => {
    const { fallback = <DefaultFallback />, errorBoundary = true } = options;
    const content = (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
    if (errorBoundary) {
      return <LazyErrorBoundary>{content}</LazyErrorBoundary>;
    }
    return content;
  };

  LazyLoaded.displayName = `LazyLoaded(${getComponentName(importFn)})`;
  return LazyLoaded;
}

function getComponentName(importFn: () => Promise<{ default: any }>): string {
  try {
    const match = importFn.toString().match(/['"]([^'"]+)['"]/);
    return match ? match[1].split('/').pop() ?? 'Component' : 'Component';
  } catch {
    return 'Component';
  }
}

export function preloadComponent(importFn: () => Promise<{ default: any }>): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = getChunkPath(importFn);
  document.head.appendChild(link);
}

function getChunkPath(importFn: () => Promise<{ default: any }>): string {
  const match = importFn.toString().match(/['"]([^'"]+)['"]/);
  return match ? match[1] : '';
}

export function prefetchComponent(importFn: () => Promise<{ default: any }>): void {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'script';
  link.href = getChunkPath(importFn);
  document.head.appendChild(link);
}

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[LazyLoad] Error loading component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="lazy-error"
          style={{
            padding: '20px',
            textAlign: 'center',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)',
          }}
        >
          <p>Falha ao carregar componente.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

#### Bundle Analysis Config

```javascript
// vite.config.ts (trecho relevante)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compress from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats/bundle-stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
    compress({
      algorithm: 'brotli',
      ext: '.br',
      threshold: 1024,
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.debug', 'console.trace'],
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-monaco': ['@theia/monaco-editor-core'],
          'vendor-nats': ['nats.ws'],
          'vendor-langgraph': ['@langchain/langgraph'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
          ],
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'entries/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        compact: true,
      },
    },
    chunkSizeWarningLimit: 250,
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
  },
});
```

#### Component Chunking Pattern

```typescript
// src/lib/performance/chunked-imports.ts
import { lazyLoad } from './lazy-load';

export const AgentProgressIndicator = lazyLoad(
  () => import('../../components/agent/AgentProgressIndicator')
);

export const AgentDecisionDialog = lazyLoad(
  () => import('../../components/agent/AgentDecisionDialog')
);

export const AgentSuggestionBanner = lazyLoad(
  () => import('../../components/agent/AgentSuggestionBanner')
);

export const AgentChatPanel = lazyLoad(
  () => import('../../components/agent/AgentChatPanel'),
  { fallback: <div className="chat-skeleton" /> }
);

export const MonacoEditor = lazyLoad(
  () => import('../../components/editor/MonacoEditor'),
  { errorBoundary: true }
);

export const DiffViewer = lazyLoad(
  () => import('../../components/editor/DiffViewer'),
  { errorBoundary: true }
);

export const DependencyGraph = lazyLoad(
  () => import('../../components/viz/DependencyGraph')
);

export const BurndownChart = lazyLoad(
  () => import('../../components/viz/BurndownChart')
);

// Preload critical chunks on idle
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('../../components/agent/AgentProgressIndicator');
      import('../../components/editor/MonacoEditor');
    }, { timeout: 3000 });
  }
}
```

### 1.3 Accessibility Implementation

#### `useFocusTrap`

```typescript
// src/lib/a11y/use-focus-trap.ts
import { useEffect, useRef, useCallback } from 'react';

interface FocusTrapOptions {
  enabled?: boolean;
  initialFocus?: 'first' | 'last' | 'auto';
  returnFocusOnDeactivate?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'area[href]',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
].join(', ');

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: FocusTrapOptions = {}
) {
  const {
    enabled = true,
    initialFocus = 'auto',
    returnFocusOnDeactivate = true,
  } = options;

  const previousActiveElement = useRef<Element | null>(null);
  const previouslyFocused = useRef<Element | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0
      );
    });
  }, [containerRef]);

  const focusFirstElement = useCallback(() => {
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      if (
        initialFocus === 'first' ||
        (initialFocus === 'auto' && focusable[0])
      ) {
        focusable[0].focus();
        return focusable[0];
      }
      if (initialFocus === 'last') {
        focusable[focusable.length - 1].focus();
        return focusable[focusable.length - 1];
      }
    }
    return null;
  }, [getFocusableElements, initialFocus]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    previousActiveElement.current = document.activeElement;
    const previouslyActive = document.activeElement as HTMLElement | null;
    previouslyFocused.current = previouslyActive;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);

      if (e.shiftKey) {
        if (currentIndex <= 0) {
          e.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      } else {
        if (currentIndex === -1 || currentIndex >= focusable.length - 1) {
          e.preventDefault();
          focusable[0].focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    if (initialFocus !== false) {
      requestAnimationFrame(() => focusFirstElement());
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (returnFocusOnDeactivate && previouslyActive) {
        previouslyActive.focus();
      }
    };
  }, [enabled, containerRef, getFocusableElements, focusFirstElement, initialFocus, returnFocusOnDeactivate]);

  return { focusFirstElement, getFocusableElements };
}
```

#### `useKeyboardNavigation`

```typescript
// src/lib/a11y/use-keyboard-navigation.ts
import { useEffect, useCallback, useRef } from 'react';

interface NavigationConfig {
  items: Array<{ id: string; disabled?: boolean }>;
  onSelect: (index: number) => void;
  orientation?: 'vertical' | 'horizontal';
  loop?: boolean;
  enabled?: boolean;
  initialIndex?: number;
}

export function useKeyboardNavigation({
  items,
  onSelect,
  orientation = 'vertical',
  loop = true,
  enabled = true,
  initialIndex = 0,
}: NavigationConfig) {
  const activeIndex = useRef(initialIndex);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setItemRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) itemRefs.current.set(id, element);
    else itemRefs.current.delete(id);
  }, []);

  const focusItem = useCallback((index: number) => {
    const item = items[index];
    if (!item || item.disabled) return;
    const element = itemRefs.current.get(item.id);
    if (element) {
      element.focus();
      activeIndex.current = index;
    }
  }, [items]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    let nextIndex = activeIndex.current;
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    if (e.key === nextKey) {
      e.preventDefault();
      nextIndex = activeIndex.current + 1;
      if (loop && nextIndex >= items.length) nextIndex = 0;
    } else if (e.key === prevKey) {
      e.preventDefault();
      nextIndex = activeIndex.current - 1;
      if (loop && nextIndex < 0) nextIndex = items.length - 1;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = items.length - 1;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(activeIndex.current);
      return;
    } else {
      return;
    }

    if (nextIndex >= 0 && nextIndex < items.length && items[nextIndex]?.disabled) {
      const direction = nextIndex > activeIndex.current ? 1 : -1;
      nextIndex += direction;
      if (loop) {
        if (nextIndex >= items.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = items.length - 1;
      }
    }
    if (nextIndex >= 0 && nextIndex < items.length) focusItem(nextIndex);
  }, [enabled, items, orientation, loop, onSelect, focusItem]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (enabled && items.length > 0) focusItem(initialIndex);
  }, [enabled, items.length, initialIndex, focusItem]);

  return { activeIndex: activeIndex.current, setItemRef, focusItem };
}
```

#### Screen Reader Announcements

```typescript
// src/lib/a11y/announcements.ts
type AnnouncementPriority = 'polite' | 'assertive';

interface Announcement {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  timestamp: number;
}

const LIVE_REGION_ID = 'ideia-live-region';
const ASSERTIVE_REGION_ID = 'ideia-assertive-region';

class ScreenReaderAnnouncer {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private announcementQueue: Announcement[] = [];
  private isProcessing = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof document !== 'undefined') this.initializeRegions();
  }

  private initializeRegions(): void {
    this.politeRegion = document.getElementById(LIVE_REGION_ID);
    if (!this.politeRegion) {
      this.politeRegion = document.createElement('div');
      this.politeRegion.id = LIVE_REGION_ID;
      this.politeRegion.setAttribute('aria-live', 'polite');
      this.politeRegion.setAttribute('aria-atomic', 'true');
      this.politeRegion.className = 'sr-only';
      document.body.appendChild(this.politeRegion);
    }
    this.assertiveRegion = document.getElementById(ASSERTIVE_REGION_ID);
    if (!this.assertiveRegion) {
      this.assertiveRegion = document.createElement('div');
      this.assertiveRegion.id = ASSERTIVE_REGION_ID;
      this.assertiveRegion.setAttribute('aria-live', 'assertive');
      this.assertiveRegion.setAttribute('aria-atomic', 'true');
      this.assertiveRegion.className = 'sr-only';
      document.body.appendChild(this.assertiveRegion);
    }
  }

  announce(message: string, priority: AnnouncementPriority = 'polite'): void {
    this.announcementQueue.push({
      id: crypto.randomUUID(),
      message,
      priority,
      timestamp: Date.now(),
    });
    if (!this.isProcessing) this.processQueue();
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    while (this.announcementQueue.length > 0) {
      const announcement = this.announcementQueue.shift()!;
      const region = announcement.priority === 'assertive' ? this.assertiveRegion : this.politeRegion;
      if (region) {
        region.textContent = '';
        requestAnimationFrame(() => { region!.textContent = announcement.message; });
      }
      await new Promise((resolve) => { this.debounceTimer = setTimeout(resolve, 300); });
    }
    this.isProcessing = false;
  }

  destroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.announcementQueue = [];
    this.isProcessing = false;
  }
}

export const announcer = new ScreenReaderAnnouncer();

export function useAnnouncer() {
  const announce = (message: string, priority?: AnnouncementPriority) => announcer.announce(message, priority);
  return { announce };
}

export function announceAgentProgress(agentName: string, stage: string): void {
  announcer.announce(`Agente ${agentName}: ${stage}`, 'polite');
}

export function announceAgentDecision(agentName: string, action: string): void {
  announcer.announce(`Agente ${agentName} requer decis√£o: ${action}`, 'assertive');
}

export function announceAgentError(agentName: string, error: string): void {
  announcer.announce(`Erro do agente ${agentName}: ${error}`, 'assertive');
}

export function announceTaskComplete(agentName: string): void {
  announcer.announce(`Tarefa do agente ${agentName} conclu√≠da`, 'polite');
}
```

#### ARIA Live Regions for Agent Messages

```tsx
// src/components/a11y/AgentLiveRegion.tsx
import React, { useEffect, useRef } from 'react';

interface AgentMessage {
  id: string;
  agentName: string;
  text: string;
  type: 'progress' | 'decision' | 'error' | 'suggestion' | 'complete';
  timestamp: number;
}

interface AgentLiveRegionProps {
  messages: AgentMessage[];
  maxVisible?: number;
}

export function AgentLiveRegion({ messages, maxVisible = 5 }: AgentLiveRegionProps) {
  const prevMessageCount = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const newMessages = messages.slice(prevMessageCount.current);
      newMessages.forEach((msg) => {
        const priority = msg.type === 'error' || msg.type === 'decision' ? 'assertive' : 'polite';
        setLiveRegionContent(msg, priority);
      });
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  return (
    <>
      <div id="agent-live-polite" aria-live="polite" aria-atomic="false" className="sr-only" />
      <div id="agent-live-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
      <div role="log" aria-label="Mensagens do agente" aria-relevant="additions" className="agent-message-log">
        {messages.slice(-maxVisible).map((msg) => (
          <AgentMessageCard key={msg.id} message={msg} />
        ))}
      </div>
    </>
  );
}

function AgentMessageCard({ message }: { message: AgentMessage }) {
  const typeColors: Record<string, string> = {
    progress: '#3b82f6', decision: '#f59e0b', error: '#ef4444',
    suggestion: '#8b5cf6', complete: '#22c55e',
  };

  return (
    <div className={`agent-message type-${message.type}`} style={{ borderLeftColor: typeColors[message.type] ?? '#64748b' }}>
      <div className="message-body">
        <strong className="message-agent">{message.agentName}</strong>
        <p className="message-text">{message.text}</p>
        <time className="message-time">{new Date(message.timestamp).toLocaleTimeString()}</time>
      </div>
    </div>
  );
}

function setLiveRegionContent(message: AgentMessage, priority: 'polite' | 'assertive'): void {
  const id = priority === 'assertive' ? 'agent-live-assertive' : 'agent-live-polite';
  const region = document.getElementById(id);
  if (region) {
    region.textContent = '';
    requestAnimationFrame(() => { region!.textContent = `[${message.agentName}] ${message.text}`; });
  }
}
```

#### WCAG Compliance Test Script

```javascript
// scripts/a11y/axe-test.mjs
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = resolve(__dirname, '../../test-results/a11y');
const TEST_URLS = [
  'http://localhost:3000',
  'http://localhost:3000/agent',
  'http://localhost:3000/project',
  'http://localhost:3000/settings',
];

mkdirSync(RESULTS_DIR, { recursive: true });

async function runTests() {
  const results = [];
  for (const url of TEST_URLS) {
    console.log(`[A11Y] Testing: ${url}`);
    try {
      const output = execSync(`npx axe ${url} --exit --save ${RESULTS_DIR}/axe-results.json --stdout`, {
        encoding: 'utf-8', timeout: 30000,
      });
      const parsed = JSON.parse(output);
      results.push({ url, violations: parsed.violations ?? [], passes: parsed.passes ?? [] });
      console.log(`  -> ${parsed.violations?.length ?? 0} viola√ß√µes`);
    } catch (error) {
      if (error.stdout) {
        try {
          const parsed = JSON.parse(error.stdout.toString());
          results.push({ url, violations: parsed.violations ?? [], passes: parsed.passes ?? [] });
          console.log(`  -> ${parsed.violations?.length ?? 0} viola√ß√µes`);
        } catch { console.error(`  -> Erro: ${error.message}`); }
      } else { console.error(`  -> Erro: ${error.message}`); }
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let report = `# Relat√≥rio de Acessibilidade\n\n**Data:** ${new Date().toISOString()}\n\n`;
  let totalViolations = 0;

  for (const result of results) {
    report += `## ${result.url}\n- Viola√ß√µes: ${result.violations.length}\n- Passes: ${result.passes.length}\n\n`;
    totalViolations += result.violations.length;
    if (result.violations.length > 0) {
      report += '| ID | Impacto | Descri√ß√£o | WCAG |\n|---|---|---|---|\n';
      for (const v of result.violations) {
        const wcagRefs = v.tags.filter((t) => t.startsWith('wcag')).join(', ');
        report += `| ${v.id} | ${v.impact} | ${v.description} | ${wcagRefs} |\n`;
      }
      report += '\n';
    }
  }

  report += `## Resumo\n- Total de URLs: ${results.length}\n- Total viola√ß√µes: ${totalViolations}\n- Status: ${totalViolations === 0 ? 'APROVADO' : 'REPROVADO'}\n`;

  const reportPath = resolve(RESULTS_DIR, `a11y-report-${timestamp}.md`);
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`\nRelat√≥rio salvo: ${reportPath}`);
  console.log(`Resultado: ${totalViolations === 0 ? 'APROVADO' : `REPROVADO (${totalViolations})`}`);
}

await runTests();
```

### 1.4 Micro-interactions Code

#### `useAnimatedMount`

```typescript
// src/lib/animations/use-animated-mount.ts
import { useState, useEffect, useCallback, useRef } from 'react';

type AnimationStage = 'enter' | 'stable' | 'exit';
type AnimationPhase = 'mounting' | 'mounted' | 'unmounting';

interface AnimatedMountOptions {
  duration?: number;
  delay?: number;
  staggerDelay?: number;
  onMount?: () => void;
  onUnmount?: () => void;
}

interface AnimatedMountResult {
  phase: AnimationPhase;
  stage: AnimationStage;
  style: React.CSSProperties;
  isVisible: boolean;
  animateUnmount: () => void;
  ref: React.RefCallback<HTMLElement>;
}

export function useAnimatedMount(
  visible: boolean,
  options: AnimatedMountOptions = {}
): AnimatedMountResult {
  const { duration = 300, delay = 0, staggerDelay = 0, onMount, onUnmount } = options;
  const [phase, setPhase] = useState<AnimationPhase>(visible ? 'mounted' : 'unmounting');
  const [stage, setStage] = useState<AnimationStage>('stable');
  const [shouldRender, setShouldRender] = useState(visible);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animateUnmount = useCallback(() => {
    setStage('exit');
    timeoutRef.current = setTimeout(() => {
      setPhase('unmounting');
      setShouldRender(false);
      onUnmount?.();
    }, duration);
  }, [duration, onUnmount]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setPhase('mounting');
      setStage('enter');
      timeoutRef.current = setTimeout(() => {
        setStage('stable');
        setPhase('mounted');
        onMount?.();
      }, duration + delay + staggerDelay);
    } else {
      animateUnmount();
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [visible, duration, delay, staggerDelay, onMount, animateUnmount]);

  const getTransformForStage = (s: AnimationStage): string => {
    switch (s) {
      case 'enter': return 'translateY(8px)';
      case 'exit': return 'translateY(-4px)';
      case 'stable': return 'translateY(0)';
    }
  };

  const getOpacityForStage = (s: AnimationStage): number => {
    switch (s) { case 'enter': case 'exit': return 0; case 'stable': return 1; }
  };

  const style: React.CSSProperties = {
    opacity: getOpacityForStage(stage),
    transform: getTransformForStage(stage),
    transition: `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    transitionDelay: `${delay + staggerDelay}ms`,
  };

  return { phase, stage, style, isVisible: shouldRender, animateUnmount, ref: () => {} };
}
```

#### Skeleton Loading Components

```tsx
// src/components/ui/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  variant?: 'text' | 'rect' | 'circle';
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 4, variant = 'text' }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: variant === 'circle' ? '50%' : typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
  };

  return <div className={`skeleton skeleton-${variant}`} style={style} aria-hidden="true" />;
}

export function AgentPanelSkeleton() {
  return (
    <div className="skeleton-agent-panel" aria-label="Carregando painel do agente...">
      <div className="skeleton-header">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="skeleton-header-text">
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} />
        </div>
      </div>
      <Skeleton height={8} borderRadius={4} />
      <div className="skeleton-stages">
        {[1, 2, 3, 4, 5].map((i) => (<Skeleton key={i} width={60} height={12} />))}
      </div>
      <Skeleton width="80%" height={14} />
      <Skeleton width="60%" height={14} />
    </div>
  );
}

export function CodeEditorSkeleton() {
  return (
    <div className="skeleton-editor" aria-label="Carregando editor...">
      <div className="skeleton-editor-header">
        <Skeleton width={100} height={12} />
        <Skeleton width={60} height={12} />
      </div>
      <div className="skeleton-editor-lines">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="skeleton-editor-line">
            <Skeleton width={28} height={12} />
            <Skeleton width={`${40 + Math.random() * 50}%`} height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DecisionDialogSkeleton() {
  return (
    <div className="skeleton-dialog" aria-label="Carregando di√°logo...">
      <Skeleton width="60%" height={24} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="100%" height={14} />
      <div className="skeleton-dialog-options">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-option">
            <Skeleton variant="circle" width={16} height={16} />
            <div className="skeleton-option-text">
              <Skeleton width={200} height={14} />
              <Skeleton width="100%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Toast Notification System

```tsx
// src/lib/notifications/toast-system.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastPriority = 'low' | 'normal' | 'high' | 'critical';
type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  priority: ToastPriority;
  duration: number;
  timestamp: number;
  action?: { label: string; onClick: () => void };
  onDismiss?: (id: string) => void;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const priorityOrder: Record<ToastPriority, number> = { low: 0, normal: 1, high: 2, critical: 3 };

const variantConfig: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  info: { bg: '#1e3a5f', border: '#3b82f6', icon: 'i' },
  success: { bg: '#14532d', border: '#22c55e', icon: 'ok' },
  warning: { bg: '#422006', border: '#eab308', icon: '!' },
  error: { bg: '#450a0a', border: '#ef4444', icon: 'x' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, 'id' | 'timestamp'>): string => {
    const id = `toast-${++counterRef.current}-${Date.now()}`;
    const newToast: Toast = { ...toast, id, timestamp: Date.now() };
    setToasts((prev) => {
      const idx = prev.findIndex((t) =>
        priorityOrder[t.priority] < priorityOrder[newToast.priority] ||
        (priorityOrder[t.priority] === priorityOrder[newToast.priority] && t.timestamp > newToast.timestamp)
      );
      return idx >= 0 ? [...prev.slice(0, idx), newToast, ...prev.slice(idx)] : [...prev, newToast];
    });
    if (toast.duration > 0) setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), toast.duration);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => { prev.find((t) => t.id === id)?.onDismiss?.(id); return prev.filter((t) => t.id !== id); });
  }, []);

  const clearToasts = useCallback(() => setToasts([]), []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" role="region" aria-label="Notifica√ß√µes" aria-live="polite"
      style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px' }}>
      {toasts.map((toast) => {
        const cfg = variantConfig[toast.variant];
        return (
          <div key={toast.id} className="toast-item" role={toast.priority === 'critical' ? 'alert' : 'status'}
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '10px', padding: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <span style={{ color: cfg.border, fontSize: '18px', lineHeight: 1 }}>{cfg.icon}</span>
            <div className="toast-body" style={{ flex: 1 }}>
              <strong style={{ color: '#f1f5f9', fontSize: '14px', display: 'block' }}>{toast.title}</strong>
              {toast.description && <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>{toast.description}</p>}
              {toast.action && (
                <button onClick={toast.action.onClick}
                  style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: '4px 0', marginTop: '6px' }}>
                  {toast.action.label}
                </button>
              )}
            </div>
            <button onClick={() => onDismiss(toast.id)} aria-label="Dispensar"
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', padding: '2px', lineHeight: 1 }}>
              {'\u2715'}
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toast-slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
}
```

#### Status Bar Agent Activity Indicator

```tsx
// src/components/statusbar/AgentActivityIndicator.tsx
import React, { useEffect, useState } from 'react';

interface AgentActivity {
  agentId: string;
  agentName: string;
  status: 'idle' | 'working' | 'waiting' | 'error';
  stage?: string;
  progress?: number;
  startedAt?: number;
}

interface AgentActivityIndicatorProps {
  activities: AgentActivity[];
  onAgentClick?: (agentId: string) => void;
}

const statusColors: Record<string, string> = { idle: '#64748b', working: '#22c55e', waiting: '#eab308', error: '#ef4444' };
const statusIcons: Record<string, string> = { idle: 'o', working: '*', waiting: 'O', error: 'x' };

export function AgentActivityIndicator({ activities, onAgentClick }: AgentActivityIndicatorProps) {
  const activeAgents = activities.filter((a) => a.status !== 'idle');
  const [elapsed, setElapsed] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeAgents.length === 0) return;
    const interval = setInterval(() => {
      const newElapsed: Record<string, string> = {};
      for (const agent of activeAgents) {
        if (agent.startedAt) {
          const diff = Date.now() - agent.startedAt;
          const sec = Math.floor(diff / 1000);
          const min = Math.floor(sec / 60);
          newElapsed[agent.agentId] = min > 0 ? `${min}m ${sec % 60}s` : `${sec}s`;
        }
      }
      setElapsed(newElapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAgents.length]);

  if (activities.length === 0) {
    return <div className="statusbar-agent-activity">Nenhum agente ativo</div>;
  }

  return (
    <div className="statusbar-agent-activity" role="status" aria-label="Atividade dos agentes">
      {activities.slice(0, 3).map((agent) => (
        <button key={agent.agentId} onClick={() => onAgentClick?.(agent.agentId)}
          title={`${agent.agentName}: ${agent.status}${agent.stage ? ` - ${agent.stage}` : ''}${elapsed[agent.agentId] ? ` (${elapsed[agent.agentId]})` : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
          <span style={{ color: statusColors[agent.status] }}>{statusIcons[agent.status]}</span>
          <span>{agent.agentName}</span>
          {agent.progress !== undefined && <span>{agent.progress}%</span>}
          {elapsed[agent.agentId] && <span style={{ color: '#64748b', fontSize: '11px' }}>{elapsed[agent.agentId]}</span>}
        </button>
      ))}
      {activities.length > 3 && <span style={{ color: '#64748b', fontSize: '12px' }}>+{activities.length - 3}</span>}
    </div>
  );
}
```

---

## 2. Plano de ImplementaÁ„o Deep Dive

> **Intensifica:** PLANO-IMPLEMENTACAO-IDEIA-DETALHADO-V2.md
> **Foco:** Grafo de dependÍncias completo, especificaÁıes tÈcnicas por tipo de
> tarefa, template de sprint planning e checklist de execuÁ„o.

### 2.1 Dependency Resolution ó Grafo Completo de 177 Tarefas

~~~text
FASE 0 (FundaÁ„o) - 25 tarefas
-------------------------------------------------------------------------------

T001 [Setup] Inicializar monorepo (pnpm workspaces, turborepo)
  ¶ Depende de: ó
  ¶ Requerido por: T002, T003, T004, T005
  ¶

T002 [Setup] Configurar TypeScript strict mode (tsconfig.base.json)
  ¶ Depende de: T001
  ¶ Requerido por: T006, T007, T008
  ¶

T003 [Setup] Configurar ESLint + Prettier + lint-staged
  ¶ Depende de: T001
  ¶ Requerido por: T006, T009
  ¶

T004 [Setup] Configurar Jest + Testing Library + Playwright
  ¶ Depende de: T001
  ¶ Requerido por: T010, T011, T012
  ¶

T005 [Setup] Configurar GitHub actions (CI, PR checks, Release)
  ¶ Depende de: T001
  ¶ Requerido por: T013, T014
  ¶

T006 [Core] Setup inversify DI container + mÛdulos
  ¶ Depende de: T002, T003
  ¶ Requerido por: T015, T016, T017
  ¶

T007 [Core] Implementar AppError hierarchy + error codes
  ¶ Depende de: T002
  ¶ Requerido por: T015, T018, T019
  ¶

T008 [Core] Implementar Contract.pre() validation system
  ¶ Depende de: T002
  ¶ Requerido por: T015, T020
  ¶

T009 [Core] Configurar conventional commits + commitlint
  ¶ Depende de: T003
  ¶ Requerido por: T013
  ¶

T010 [Core] Implementar base test utilities (mocks, fixtures)
  ¶ Depende de: T004
  ¶ Requerido por: T021, T022
  ¶

T011 [Core] Configurar StrykerJS mutation testing
  ¶ Depende de: T004
  ¶ Requerido por: T021
  ¶

T012 [Core] Configurar Pact contract testing framework
  ¶ Depende de: T004
  ¶ Requerido por: T022
  ¶

T013 [DevOps] Configurar GitHub status checks + branch protection
  ¶ Depende de: T005, T009
  ¶ Requerido por: T023
  ¶

T014 [DevOps] Configurar SBOM generation (CycloneDX)
  ¶ Depende de: T005
  ¶ Requerido por: T024
  ¶

T015 [NATS] Implementar NATS JetStream connection manager
  ¶ Depende de: T006, T007, T008
  ¶ Requerido por: T025, T026, T027
  ¶

T016 [Core] Implementar mÛdulo de configuraÁ„o (env, config files)
  ¶ Depende de: T006
  ¶ Requerido por: T025
  ¶

T017 [Core] Implementar LoggerModule (pino + correlation IDs)
  ¶ Depende de: T006
  ¶ Requerido por: T025, T028
  ¶

T018 [Core] Implementar error middleware (Express/Fastify)
  ¶ Depende de: T007
  ¶ Requerido por: T029
  ¶

T019 [Core] Implementar error reporting to NATS
  ¶ Depende de: T007, T015
  ¶ Requerido por: T030
  ¶

T020 [Core] Implementar DTO validators com Contract.pre()
  ¶ Depende de: T008
  ¶ Requerido por: T029, T031
  ¶

T021 [Quality] Implementar quality gate scripts (npm run ai:*)
  ¶ Depende de: T010, T011
  ¶ Requerido por: T023
  ¶

T022 [Quality] Implementar contract test runner
  ¶ Depende de: T010, T012
  ¶ Requerido por: T031
  ¶

T023 [DevOps] Implementar PR checklist automation (GitHub App)
  ¶ Depende de: T013, T021
  ¶ Requerido por: T032, T033
  ¶

T024 [Security] Configurar Talisman (secret scanner) + CodeQL
  ¶ Depende de: T014
  ¶ Requerido por: T034
  ¶

T025 [NATS] Implementar Stream/Consumer management API
  ¶ Depende de: T015, T016, T017
  ¶ Requerido por: T035, T036
  ¶

FASE 1 (N˙cleo) - 30 tarefas
-------------------------------------------------------------------------------

T026 [NATS] Implementar Pub/Sub pattern (publisher + subscriber)
  ¶ Depende de: T015
  ¶ Requerido por: T037, T038
  ¶

T027 [NATS] Implementar Request/Reply pattern
  ¶ Depende de: T015
  ¶ Requerido por: T038, T039
  ¶

T028 [NATS] Implementar Key-Value store (bucket manager)
  ¶ Depende de: T017
  ¶ Requerido por: T040
  ¶

T029 [API] Implementar API Gateway (Fastify + routes)
  ¶ Depende de: T018, T020
  ¶ Requerido por: T041, T042
  ¶

T030 [API] Implementar health check endpoints + readiness
  ¶ Depende de: T019
  ¶ Requerido por: T041
  ¶

T031 [Integration] Implementar API contract tests (Pact consumer)
  ¶ Depende de: T020, T022
  ¶ Requerido por: T043
  ¶

T032 [DevOps] Implementar deploy preview (Vercel/Cloudflare)
  ¶ Depende de: T023
  ¶ Requerido por: T044
  ¶

T033 [DevOps] Implementar auto-changelog generation
  ¶ Depende de: T023
  ¶ Requerido por: T045
  ¶

T034 [Security] Implementar OWASP dependency check
  ¶ Depende de: T024
  ¶ Requerido por: T046
  ¶

T035 [NATS] Implementar Dead Letter Queue (DLQ) consumer
  ¶ Depende de: T025
  ¶ Requerido por: T047
  ¶

T036 [NATS] Implementar stream replication + mirroring
  ¶ Depende de: T025
  ¶ Requerido por: T048
  ¶

T037 [NATS] Implementar event sourcing com JetStream
  ¶ Depende de: T026
  ¶ Requerido por: T049
  ¶

T038 [NATS] Implementar RPC timeout + retry + circuit breaker
  ¶ Depende de: T026, T027
  ¶ Requerido por: T050
  ¶

T039 [NATS] Implementar service discovery via NATS
  ¶ Depende de: T027
  ¶ Requerido por: T051
  ¶

T040 [NATS] Implementar distributed lock via KV store
  ¶ Depende de: T028
  ¶ Requerido por: T052
  ¶

T041 [API] Implementar rate limiting + request validation
  ¶ Depende de: T029, T030
  ¶ Requerido por: T053
  ¶

T042 [API] Implementar WebSocket upgrade handler
  ¶ Depende de: T029
  ¶ Requerido por: T054
  ¶

T043 [Integration] Implementar Pact provider verification
  ¶ Depende de: T031
  ¶ Requerido por: T055
  ¶

T044 [DevOps] Implementar feature branch environments
  ¶ Depende de: T032
  ¶ Requerido por: T056
  ¶

T045 [DevOps] Implementar release pipeline (npm publish, tag)
  ¶ Depende de: T033
  ¶ Requerido por: T057
  ¶

T046 [Security] Implementar dependency vulnerability alerts
  ¶ Depende de: T034
  ¶ Requerido por: T058
  ¶

T047 [NATS] Implementar DLQ retry policies + alerting
  ¶ Depende de: T035
  ¶ Requerido por: T059
  ¶

T048 [NATS] Implementar multi-region stream replication
  ¶ Depende de: T036
  ¶ Requerido por: T060
  ¶

T049 [Events] Implementar Domain Event bus on NATS
  ¶ Depende de: T037
  ¶ Requerido por: T061, T062
  ¶

T050 [Resilience] Implementar circuit breaker (Opossum)
  ¶ Depende de: T038
  ¶ Requerido por: T063
  ¶

T051 [NATS] Implementar load balancer (queue groups)
  ¶ Depende de: T039
  ¶ Requerido por: T064
  ¶

T052 [NATS] Implementar leader election via KV lock
  ¶ Depende de: T040
  ¶ Requerido por: T065
  ¶

T053 [API] Implementar API versioning + deprecation
  ¶ Depende de: T041
  ¶ Requerido por: T066
  ¶

T054 [API] Implementar SSE (Server-Sent Events) endpoint
  ¶ Depende de: T042
  ¶ Requerido por: T067
  ¶

T055 [Integration] Implementar CDC (Consumer-Driven Contracts)
  ¶ Depende de: T043
  ¶ Requerido por: T068
  ¶

FASE 2 (Agentes) - 30 tarefas
-------------------------------------------------------------------------------

T056 [Env] Implementar feature flag system (Unleash/OpenFeature)
  ¶ Depende de: T044
  ¶ Requerido por: T069
  ¶

T057 [Release] Implementar canary releases + blue-green
  ¶ Depende de: T045
  ¶ Requerido por: T070
  ¶

T058 [Security] Implementar Snyk/Socket.dev scanning
  ¶ Depende de: T046
  ¶ Requerido por: T071
  ¶

T059 [NATS] Implementar DLQ dashboard (grafana)
  ¶ Depende de: T047
  ¶ Requerido por: T072
  ¶

T060 [NATS] Implementar stream health checks
  ¶ Depende de: T048
  ¶ Requerido por: T073
  ¶

T061 [Events] Implementar Event Sourcing repository
  ¶ Depende de: T049
  ¶ Requerido por: T074
  ¶

T062 [Events] Implementar CQRS read model projector
  ¶ Depende de: T049
  ¶ Requerido por: T075
  ¶

T063 [Resilience] Implementar retry with exponential backoff
  ¶ Depende de: T050
  ¶ Requerido por: T076
  ¶

T064 [NATS] Implementar adaptive load balancing
  ¶ Depende de: T051
  ¶ Requerido por: T077
  ¶

T065 [NATS] Implementar lease renewal + fencing
  ¶ Depende de: T052
  ¶ Requerido por: T078
  ¶

T066 [API] Implementar API documentation (Scalar/Swagger)
  ¶ Depende de: T053
  ¶ Requerido por: T079
  ¶

T067 [API] Implementar real-time event stream (SSE)
  ¶ Depende de: T054
  ¶ Requerido por: T080
  ¶

T068 [Integration] Implementar Pact broker + webhooks
  ¶ Depende de: T055
  ¶ Requerido por: T081
  ¶

T069 [Agents] Implementar Agent Runtime core
  ¶ Depende de: T056
  ¶ Requerido por: T082, T083, T084
  ¶

T070 [Agents] Implementar tool execution sandbox
  ¶ Depende de: T057
  ¶ Requerido por: T082
  ¶

T071 [Security] Implementar LLM output validation guard
  ¶ Depende de: T058
  ¶ Requerido por: T085
  ¶

T072 [Observability] Implementar NATS dashboard (grafana)
  ¶ Depende de: T059
  ¶ Requerido por: T086
  ¶

T073 [Observability] Implementar stream latency monitoring
  ¶ Depende de: T060
  ¶ Requerido por: T087
  ¶

T074 [Events] Implementar event replay + snapshot
  ¶ Depende de: T061
  ¶ Requerido por: T088
  ¶

T075 [Events] Implementar read model cache (Redis)
  ¶ Depende de: T062
  ¶ Requerido por: T089
  ¶

T076 [Resilience] Implementar bulkhead pattern
  ¶ Depende de: T063
  ¶ Requerido por: T090
  ¶

T077 [NATS] Implementar weighted queue groups
  ¶ Depende de: T064
  ¶ Requerido por: T091
  ¶

T078 [Resilience] Implementar fencing token validation
  ¶ Depende de: T065
  ¶ Requerido por: T092
  ¶

T079 [API] Implementar OpenAPI/Swagger UI
  ¶ Depende de: T066
  ¶ Requerido por: T093
  ¶

T080 [Real-time] Implementar event subscription manager
  ¶ Depende de: T067
  ¶ Requerido por: T094
  ¶

T081 [Integration] Implementar integration test suite
  ¶ Depende de: T068
  ¶ Requerido por: T095
  ¶

T082 [Agents] Implementar base agent class + lifecycle
  ¶ Depende de: T069, T070
  ¶ Requerido por: T096, T097
  ¶

T083 [Agents] Implementar LLM integration (Ollama)
  ¶ Depende de: T069
  ¶ Requerido por: T096
  ¶

T084 [Agents] Implementar MCP protocol handler
  ¶ Depende de: T069
  ¶ Requerido por: T098
  ¶

T085 [Security] Implementar prompt injection detector
  ¶ Depende de: T071
  ¶ Requerido por: T099
  ¶

FASE 3 (InteligÍncia) - 30 tarefas
-------------------------------------------------------------------------------

T086 [Observability] Implementar OpenTelemetry tracing
  ¶ Depende de: T072
  ¶ Requerido por: T100
  ¶

T087 [Observability] Implementar custom metrics + dashboards
  ¶ Depende de: T073
  ¶ Requerido por: T100
  ¶

T088 [Events] Implementar event versioning + migration
  ¶ Depende de: T074
  ¶ Requerido por: T101
  ¶

T089 [Cache] Implementar Redis cache provider
  ¶ Depende de: T075
  ¶ Requerido por: T102
  ¶

T090 [Resilience] Implementar health check + self-heal
  ¶ Depende de: T076
  ¶ Requerido por: T103
  ¶

T091 [NATS] Implementar connection draining + graceful shutdown
  ¶ Depende de: T077
  ¶ Requerido por: T104
  ¶

T092 [Security] Implementar audit trail (NATS KV)
  ¶ Depende de: T078
  ¶ Requerido por: T105
  ¶

T093 [API] Implementar SDK/client library
  ¶ Depende de: T079
  ¶ Requerido por: T106
  ¶

T094 [Real-time] Implementar presence system
  ¶ Depende de: T080
  ¶ Requerido por: T107
  ¶

T095 [Integration] Implementar end-to-end test suite
  ¶ Depende de: T081
  ¶ Requerido por: T108
  ¶

T096 [Agents] Implementar 5 agent roles (Analyst, Architect, etc.)
  ¶ Depende de: T082, T083
  ¶ Requerido por: T109, T110
  ¶

T097 [Agents] Implementar agent collaboration protocol
  ¶ Depende de: T082
  ¶ Requerido por: T109
  ¶

T098 [Agents] Implementar MCP server registry
  ¶ Depende de: T084
  ¶ Requerido por: T111
  ¶

T099 [Security] Implementar allowlist/blocklist de tools
  ¶ Depende de: T085
  ¶ Requerido por: T112
  ¶

T100 [Observability] Implementar traces -> metrics -> logs pipeline
  ¶ Depende de: T086, T087
  ¶ Requerido por: T113
  ¶

T101 [Events] Implementar Schema Registry (Apicurio)
  ¶ Depende de: T088
  ¶ Requerido por: T114
  ¶

T102 [Cache] Implementar cache invalidation strategies
  ¶ Depende de: T089
  ¶ Requerido por: T115
  ¶

T103 [Resilience] Implementar auto-recovery procedures
  ¶ Depende de: T090
  ¶ Requerido por: T116
  ¶

T104 [NATS] Implementar connection pooling
  ¶ Depende de: T091
  ¶ Requerido por: T117
  ¶

T105 [Security] Implementar audit log viewer
  ¶ Depende de: T092
  ¶ Requerido por: T118
  ¶

T106 [API] Implementar GraphQL federation gateway
  ¶ Depende de: T093
  ¶ Requerido por: T119
  ¶

T107 [Real-time] Implementar cursor/protocol sync (OT/CRDT)
  ¶ Depende de: T094
  ¶ Requerido por: T120
  ¶

T108 [Quality] Implementar load testing suite (k6)
  ¶ Depende de: T095
  ¶ Requerido por: T121
  ¶

T109 [Agents] Implementar multi-agent orchestrator
  ¶ Depende de: T096, T097
  ¶ Requerido por: T122, T123
  ¶

T110 [Agents] Implementar agent specialization system
  ¶ Depende de: T096
  ¶ Requerido por: T122
  ¶

T111 [Agents] Implementar MCP tool marketplace
  ¶ Depende de: T098
  ¶ Requerido por: T124
  ¶

T112 [Security] Implementar tool capability attestation
  ¶ Depende de: T099
  ¶ Requerido por: T125
  ¶

T113 [Observability] Implementar root cause analysis
  ¶ Depende de: T100
  ¶ Requerido por: T126
  ¶

T114 [Events] Implementar asyncapi documentation
  ¶ Depende de: T101
  ¶ Requerido por: T127
  ¶

T115 [Cache] Implementar cache warming strategies
  ¶ Depende de: T102
  ¶ Requerido por: T128
  ¶

FASE 4 (MemÛria) - 25 tarefas
-------------------------------------------------------------------------------

T116 [Resilience] Implementar chaos engineering toolkit
  ¶ Depende de: T103
  ¶ Requerido por: T129
  ¶

T117 [NATS] Implementar multi-tenant isolation
  ¶ Depende de: T104
  ¶ Requerido por: T130
  ¶

T118 [Security] Implementar audit compliance reports
  ¶ Depende de: T105
  ¶ Requerido por: T131
  ¶

T119 [API] Implementar REST <-> GraphQL bridge
  ¶ Depende de: T106
  ¶ Requerido por: T132
  ¶

T120 [Real-time] Implementar offline support + sync
  ¶ Depende de: T107
  ¶ Requerido por: T133
  ¶

T121 [Quality] Implementar performance regression detection
  ¶ Depende de: T108
  ¶ Requerido por: T134
  ¶

T122 [Agents] Implementar LangGraph workflow engine
  ¶ Depende de: T109, T110
  ¶ Requerido por: T135, T136
  ¶

T123 [Agents] Implementar agent inter-communication
  ¶ Depende de: T109
  ¶ Requerido por: T135
  ¶

T124 [Agents] Implementar tool rating + discovery
  ¶ Depende de: T111
  ¶ Requerido por: T137
  ¶

T125 [Security] Implementar MCP manifest verification
  ¶ Depende de: T112
  ¶ Requerido por: T138
  ¶

T126 [Observability] Implementar anomaly detection
  ¶ Depende de: T113
  ¶ Requerido por: T139
  ¶

T127 [Events] Implementar event catalog
  ¶ Depende de: T114
  ¶ Requerido por: T140
  ¶

T128 [Cache] Implementar distributed cache (Redis Cluster)
  ¶ Depende de: T115
  ¶ Requerido por: T141
  ¶

T129 [Resilience] Implementar self-healing agents
  ¶ Depende de: T116
  ¶ Requerido por: T142
  ¶

T130 [NATS] Implementar tenant-level QoS
  ¶ Depende de: T117
  ¶ Requerido por: T143
  ¶

T131 [Memory] Implementar Mem0 integration
  ¶ Depende de: T118
  ¶ Requerido por: T144, T145
  ¶

T132 [API] Implementar API rate limit tiers
  ¶ Depende de: T119
  ¶ Requerido por: T146
  ¶

T133 [Real-time] Implementar conflict resolution (CRDT)
  ¶ Depende de: T120
  ¶ Requerido por: T147
  ¶

T134 [Quality] Implementar flaky test detector
  ¶ Depende de: T121
  ¶ Requerido por: T148
  ¶

T135 [Agents] Implementar agent memory (short/long-term)
  ¶ Depende de: T122, T123
  ¶ Requerido por: T149
  ¶

T136 [Agents] Implementar DSPy optimizer integration
  ¶ Depende de: T122
  ¶ Requerido por: T150
  ¶

T137 [Agents] Implementar tool execution analytics
  ¶ Depende de: T124
  ¶ Requerido por: T151
  ¶

T138 [Security] Implementar Cedar policy engine
  ¶ Depende de: T125
  ¶ Requerido por: T152
  ¶

T139 [Memory] Implementar SQLite+FTS5 persistence
  ¶ Depende de: T126
  ¶ Requerido por: T144
  ¶

T140 [Memory] Implementar DuckDB analytics store
  ¶ Depende de: T127
  ¶ Requerido por: T153
  ¶

FASE 5 (Frontend) - 20 tarefas
-------------------------------------------------------------------------------

T141 [Cache] Implementar cache-aside + write-through
  ¶ Depende de: T128
  ¶ Requerido por: T154
  ¶

T142 [Resilience] Implementar degraded mode operation
  ¶ Depende de: T129
  ¶ Requerido por: T155
  ¶

T143 [NATS] Implementar tenant audit dashboard
  ¶ Depende de: T130
  ¶ Requerido por: T156
  ¶

T144 [Memory] Implementar Knowledge Graph (Neo4j)
  ¶ Depende de: T131, T139
  ¶ Requerido por: T157
  ¶

T145 [Memory] Implementar RAG pipeline (pgvector)
  ¶ Depende de: T131
  ¶ Requerido por: T157
  ¶

T146 [API] Implementar API key management
  ¶ Depende de: T132
  ¶ Requerido por: T158
  ¶

T147 [Real-time] Implementar CRDT document store
  ¶ Depende de: T133
  ¶ Requerido por: T159
  ¶

T148 [Quality] Implementar mutation testing dashboard
  ¶ Depende de: T134
  ¶ Requerido por: T160
  ¶

T149 [Agents] Implementar learning engine (feedback loop)
  ¶ Depende de: T135
  ¶ Requerido por: T161
  ¶

T150 [Agents] Implementar ADAPT optimizer
  ¶ Depende de: T136
  ¶ Requerido por: T162
  ¶

T151 [Agents] Implementar cost tracking per tool call
  ¶ Depende de: T137
  ¶ Requerido por: T163
  ¶

T152 [Security] Implementar policy-as-code (Cedar)
  ¶ Depende de: T138
  ¶ Requerido por: T164
  ¶

T153 [Memory] Implementar cross-project pattern detection
  ¶ Depende de: T140
  ¶ Requerido por: T165
  ¶

T154 [Frontend] Implementar Theia plugin scaffold
  ¶ Depende de: T141
  ¶ Requerido por: T166, T167
  ¶

T155 [Frontend] Implementar Monaco editor integration
  ¶ Depende de: T142
  ¶ Requerido por: T166
  ¶

T156 [Frontend] Implementar Theia AI integration
  ¶ Depende de: T143
  ¶ Requerido por: T168
  ¶

T157 [Memory] Implementar hybrid search (vector + graph + FTS)
  ¶ Depende de: T144, T145
  ¶ Requerido por: T169
  ¶

T158 [Frontend] Implementar login/auth UI
  ¶ Depende de: T146
  ¶ Requerido por: T170
  ¶

T159 [Frontend] Implementar real-time collaboration UI
  ¶ Depende de: T147
  ¶ Requerido por: T171
  ¶

T160 [Frontend] Implementar quality dashboard
  ¶ Depende de: T148
  ¶ Requerido por: T172
  ¶

FASE 6 (Entrega) - 17 tarefas
-------------------------------------------------------------------------------

T161 [Agents] Implementar cross-project learning
  ¶ Depende de: T149
  ¶ Requerido por: T173
  ¶

T162 [Agents] Implementar prompt optimization engine
  ¶ Depende de: T150
  ¶ Requerido por: T173
  ¶

T163 [Agents] Implementar budget-aware execution
  ¶ Depende de: T151
  ¶ Requerido por: T174
  ¶

T164 [Security] Implementar policy audit + enforcement
  ¶ Depende de: T152
  ¶ Requerido por: T175
  ¶

T165 [Memory] Implementar pattern recommendation engine
  ¶ Depende de: T153
  ¶ Requerido por: T176
  ¶

T166 [Frontend] Implementar IDEIA sidebar + panels
  ¶ Depende de: T154, T155
  ¶ Requerido por: T177
  ¶

T167 [Frontend] Implementar project wizard
  ¶ Depende de: T154
  ¶ Requerido por: T177
  ¶

T168 [Frontend] Implementar agent chat UI (+ streaming)
  ¶ Depende de: T156
  ¶ Requerido por: T177
  ¶

T169 [Memory] Implementar context-aware suggestions
  ¶ Depende de: T157
  ¶ Requerido por: ó
  ¶

T170 [Frontend] Implementar settings/preferences panel
  ¶ Depende de: T158
  ¶ Requerido por: ó
  ¶

T171 [Frontend] Implementar collaborative editing UI
  ¶ Depende de: T159
  ¶ Requerido por: ó
  ¶

T172 [Frontend] Implementar quality gate visualization
  ¶ Depende de: T160
  ¶ Requerido por: ó
  ¶

T173 [Agents] Implementar agent self-improvement loop
  ¶ Depende de: T161, T162
  ¶ Requerido por: ó
  ¶

T174 [Agents] Implementar resource-aware scheduling
  ¶ Depende de: T163
  ¶ Requerido por: ó
  ¶

T175 [Security] Implementar continuous compliance
  ¶ Depende de: T164
  ¶ Requerido por: ó
  ¶

T176 [Memory] Implementar cross-project insight sharing
  ¶ Depende de: T165
  ¶ Requerido por: ó
  ¶

T177 [Frontend] Implementar onboarding tutorial
  ¶ Depende de: T166, T167, T168
  ¶ Requerido por: ó
  ¶
~~~

### 2.2 Technical Specifications per Task Type

#### Backend API Task - Template

```yaml
task:
  id: "TXXX"
  title: "[API] Implementar <endpoint>"
  type: backend-api
  specification:
    openapi: |
      openapi: 3.1.0
      info:
        title: IDEIA API - <endpoint>
      paths:
        /api/v1/<resource>:
          get:
            operationId: listResources
            responses:
              '200':
                description: Lista
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Resource'
    validation_rules:
      - field: name
        type: string
        required: true
        min_length: 3
        max_length: 120
    error_codes:
      - code: RESOURCE_NOT_FOUND
        status: 404
      - code: VALIDATION_ERROR
        status: 400
    event_schemas:
      - event: resource.created
        version: 1
        payload:
          type: object
          properties:
            id: { type: string, format: uuid }
            name: { type: string }
    contract_tests:
      - type: pact
        consumer: consumer-service
        provider: provider-service
        interactions:
          - description: "Criar recurso valido"
            request:
              method: POST
              path: /api/v1/resource
              body:
                name: "Test"
            response:
              status: 201
```

#### Frontend Component Task - Template

```typescript
interface ComponentProps {
  data: ComponentData;
  onAction: (action: ComponentAction) => void;
  loading?: boolean;
  error?: string | null;
}

// State machine: idle -> loading -> ready -> error
// A11y: role="region", aria-live="polite", keyboard nav
// Perf: < 50ms paint, < 20KB gzipped
```

#### Infrastructure Task - Template

```hcl
resource "aws_security_group" "main" {
  name        = "${var.project_name}-${var.environment}"
  description = "IDEIA security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 4222
    to_port     = 4222
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}
```

#### Agent Task - Template

```yaml
agent:
  name: "<AgentName>"
  role: "<role>"
  autonomy_level: 2
  prompt_template: |
    Voce e o agente {role} da IDEIA.
    Objetivo: {objective}
    Ferramentas: {tools}
  tools:
    - name: read_file
      description: "Ler arquivo"
      parameters:
        path: { type: string }
  mcp_manifest:
    schema_version: "1.0"
    capabilities: [read, write]
    rate_limit:
      requests_per_minute: 60
  evaluation:
    metrics: [task_completion, code_quality, response_time]
    success_criteria:
      - task_completion > 0.9
```

#### Integration Task - Template

```yaml
integration:
  name: "<IntegrationName>"
  type: "<event|api|stream>"
  event_schema:
    asyncapi: "2.6.0"
    channels:
      service.action:
        publish:
          message:
            payload:
              type: object
              properties:
                eventId: { type: string, format: uuid }
                eventType: { type: string }
                timestamp: { type: string, format: date-time }
  contract_test:
    type: pact
    interactions:
      - description: "Processar evento"
        request:
          method: POST
          path: /api/v1/events/action
          body:
            eventId: "test-001"
        response:
          status: 202
          body:
            accepted: true
  integration_test_plan:
    steps:
      - step: 1
        action: "Setup test environment"
        command: "docker compose up -d"
      - step: 2
        action: "Publish test event"
        command: "nats pub subject payload"
      - step: 3
        action: "Verify consumer"
        command: "curl http://localhost:8080/events/id"
      - step: 4
        action: "Teardown"
        command: "docker compose down"
```

### 2.3 Sprint Planning Template

```yaml
sprint:
  duration: 14 days
  team_size: 4
  capacity: 40h/person/sprint
  ceremonies:
    - planning (2h, day 1)
    - daily (15min, days 1-14)
    - review (1h, day 14)
    - retro (1.5h, day 14)
```

#### Velocity Tracking

```typescript
class VelocityTracker {
  private history: SprintMetrics[] = [];

  getRollingVelocity(window = 3): number {
    const recent = this.history.slice(-window);
    return recent.reduce((s, m) => s + m.completedPoints, 0) / recent.length;
  }

  getPredictiveVelocity(confidence: 0.9) {
    const v = this.history.map((m) => m.completedPoints);
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    const std = Math.sqrt(v.reduce((sq, x) => sq + (x - avg) ** 2, 0) / v.length);
    return {
      min: Math.max(0, Math.round(avg - 1.65 * std)),
      avg: Math.round(avg),
      max: Math.round(avg + 1.65 * std),
    };
  }
}
```

#### PERT Estimation

```typescript
class PertEstimator {
  calculateDuration(e: { optimistic: number; mostLikely: number; pessimistic: number }) {
    return (e.optimistic + 4 * e.mostLikely + e.pessimistic) / 6;
  }
}
```

### 2.4 Task Execution Checklist

#### Backend Checklist
- [ ] OpenAPI spec reviewed
- [ ] DTOs with Contract.pre()
- [ ] Error codes in AppError
- [ ] Pact consumer tests
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] Code review by 2 peers

#### Agent Checklist
- [ ] System prompt defined
- [ ] MCP tool specs written
- [ ] Integration tests pass
- [ ] Eval: completion > 90%
- [ ] Canary deploy (10%)

#### Infrastructure Checklist
- [ ] Terraform/HCL written
- [ ] Security groups minimized
- [ ] IaC plan reviewed
- [ ] Health checks configured
- [ ] Rollback documented

---

## 3. Desktop Native Deep Dive

> **Intensifica:** `ESTUDO-DESKTOP-NATIVE.md`
> **Foco:** Guia de migracao Tauri v2, arquitetura sidecar, CI/CD desktop.

### 3.1 Tauri Migration Guide

#### Step 1: Cargo Init

```bash
cd packages/desktop
cargo init --name ideia-desktop
cargo add tauri@2.0.0
cargo add tauri-build@2.0.0 --build
cargo add serde@1.0 --features derive
cargo add serde_json@1.0
cargo add tokio@1.0 --features full
```

#### Step 2: tauri.conf.json

```json
{
  "productName": "IDEIA",
  "version": "0.1.0",
  "identifier": "com.ideia.desktop",
  "build": {
    "frontendDist": "../../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "IDEIA",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"]
  },
  "plugins": {
    "shell": { "open": true, "scope": [{ "name": "node-sidecar", "cmd": "node" }] },
    "updater": { "active": true, "endpoints": ["https://releases.ideia.app/updates"] },
    "fs": { "scope": { "allow": ["$APPDATA/**"] } }
  }
}
```

#### Step 3: Rust IPC Bridge

```rust
// src/main.rs
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Default)]
struct AppState {
    nats_connected: std::sync::Mutex<bool>,
}

#[tauri::command]
async fn get_system_metrics(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "nats_connected": *state.nats_connected.lock().unwrap(),
        "memory_mb": 0,
        "cpu_percent": 0.0,
    }))
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![get_system_metrics])
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}
```

#### Step 4: TypeScript IPC Bindings

```typescript
import { invoke } from '@tauri-apps/api/core';

export interface SystemMetrics {
  nats_connected: boolean;
  memory_mb: number;
  cpu_percent: number;
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  return invoke('get_system_metrics');
}
```

#### Step 5: Window Management

```typescript
import { Window } from '@tauri-apps/api/window';

export class WindowManager {
  private windows: Map<string, Window> = new Map();

  async createProjectWindow(id: string): Promise<Window> {
    const win = new Window(`project-${id}`, {
      url: `/project/${id}`,
      width: 1200,
      height: 800,
    });
    win.onCloseRequested(() => this.windows.delete(id));
    this.windows.set(id, win);
    return win;
  }
}
```

#### Step 6: Auto-Updater

```typescript
import { checkUpdate, installUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export async function checkForUpdates(): Promise<void> {
  const update = await checkUpdate();
  if (update?.shouldUpdate) {
    await installUpdate();
    await relaunch();
  }
}
```

#### Step 7-10: FS, Dialogs, Tray, Deep Links

```typescript
// File System
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

export async function readConfig<T>(name: string): Promise<T | null> {
  try {
    const path = await join(await appDataDir(), name + '.json');
    return JSON.parse(await readTextFile(path));
  } catch {
    return null;
  }
}

// Native Dialogs
import { open, save, message } from '@tauri-apps/plugin-dialog';

export async function pickFile() {
  return open({ multiple: false });
}

// System Tray
import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu, MenuItem } from '@tauri-apps/api/menu';

export async function setupTray() {
  const items = [await MenuItem.new('quit', { text: 'Sair' })];
  const menu = await Menu.new({ items });
  await TrayIcon.new({ icon: 'icon.png', tooltip: 'IDEIA', menu });
}

// Deep Links
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

export async function setupDeepLinks(handler: (url: string) => void) {
  await onOpenUrl((urls) => urls.forEach(handler));
}
```

### 3.2 Sidecar Node.js Architecture

```typescript
// sidecar-manager.ts
import { ChildProcess, Command } from '@tauri-apps/plugin-shell';

interface SidecarConfig {
  name: string;
  command: string;
  args: string[];
  maxRestarts?: number;
  restartDelay?: number;
}

export class SidecarManager {
  private instances = new Map<string, { process: ChildProcess; restarts: number }>();

  async start(config: SidecarConfig) {
    const cmd = Command.sidecar(config.command, config.args);
    const process = await cmd.spawn();
    this.instances.set(config.name, { process, restarts: 0 });

    process.on('close', async (code) => {
      console.log(`[Sidecar] ${config.name} exited: ${code}`);
      const instance = this.instances.get(config.name)!;
      if (instance.restarts < (config.maxRestarts ?? 3)) {
        instance.restarts++;
        await new Promise((r) => setTimeout(r, config.restartDelay ?? 2000));
        await this.start(config);
      }
    });
  }

  async stop(name: string) {
    const inst = this.instances.get(name);
    if (inst) {
      inst.process.kill();
      this.instances.delete(name);
    }
  }

  async stopAll() {
    for (const [name] of this.instances) await this.stop(name);
  }
}
```

### 3.3 CI/CD for Desktop Builds

```yaml
name: Desktop Build
on:
  push: { tags: ['v*'] }

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
        with: { targets: x86_64-pc-windows-msvc }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:desktop
      - name: Upload MSI
        uses: actions/upload-artifact@v4
        with:
          name: ideia-windows
          path: target/release/bundle/msi/*.msi

  build-macos:
    runs-on: macos-latest
    strategy:
      matrix:
        arch: [x86_64, aarch64]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.arch == 'x86_64' && 'x86_64-apple-darwin' || 'aarch64-apple-darwin' }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:desktop
      - uses: actions/upload-artifact@v4
        with:
          name: ideia-macos-${{ matrix.arch }}
          path: target/release/bundle/dmg/*.dmg

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
      - run: |
          sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev
          pnpm install --frozen-lockfile
      - run: pnpm build:desktop
      - uses: actions/upload-artifact@v4
        with:
          name: ideia-linux
          path: target/release/bundle/appimage/*.AppImage

  release:
    needs: [build-windows, build-macos, build-linux]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            **/*.msi
            **/*.dmg
            **/*.AppImage
```

---

## 4. Matriz Tecnologica Deep Dive

> **Intensifica:** `MATRIZ-TECNOLOGICA-COMPLETA-V2-SUPLEMENTO.md`
> **Foco:** Algoritmo de selecao, especificacoes de contratos, scripts de migracao.

### 4.1 Technology Selection Algorithm

```typescript
interface TechnologyOption {
  id: string;
  name: string;
  version: string;
  category: string;
  scores: Record<string, number>;
  costs: { license: string; operational: number; learning: number };
  constraints: { incompatibleWith: string[]; requires: string[] };
  metrics: { community: number; maturity: number; performance: number; security: number };
}

interface SelectionContext {
  budget: number;
  teamSize: number;
  existingStack: string[];
  scale: 'dev' | 'staging' | 'prod';
  latency: 'low' | 'medium' | 'high';
}

class TechnologySelector {
  private options: TechnologyOption[] = [];
  private criteria = [
    { name: 'performance', weight: 0.25, max: true },
    { name: 'community', weight: 0.15, max: true },
    { name: 'maturity', weight: 0.15, max: true },
    { name: 'security', weight: 0.15, max: true },
    { name: 'operational_cost', weight: 0.15, max: false },
    { name: 'learning_cost', weight: 0.15, max: false },
  ];

  registerOption(opt: TechnologyOption) {
    this.options.push(opt);
  }

  select(category: string, ctx: SelectionContext) {
    const candidates = this.options.filter((o) => o.category === category);
    const scores = candidates.map((opt) => {
      let total = 0;
      for (const c of this.criteria) {
        const normalized = this.normalize(candidates, c.name);
        total += (normalized.get(opt.id) ?? 0) * c.weight;
      }
      for (const inc of opt.constraints.incompatibleWith) {
        if (ctx.existingStack.includes(inc)) total *= 0.5;
      }
      return { option: opt, score: total };
    });
    scores.sort((a, b) => b.score - a.score);
    return {
      selected: scores[0].option,
      alternatives: scores,
      reasoning: `Selected ${scores[0].option.name} (score: ${(scores[0].score * 100).toFixed(1)}%)`,
    };
  }

  private normalize(opts: TechnologyOption[], key: string): Map<string, number> {
    const raw = opts.map((o) => ({ id: o.id, v: o.scores[key] ?? 0 }));
    const max = Math.max(...raw.map((r) => r.v), 1);
    const min = Math.min(...raw.map((r) => r.v), 0);
    const range = max - min || 1;
    return new Map(raw.map((r) => [r.id, (r.v - min) / range]));
  }
}

// Example: Vector DB selection (pgvector vs Qdrant vs ChromaDB)
const selector = new TechnologySelector();

selector.registerOption({
  id: 'pgvector', name: 'pgvector', version: '0.7.0',
  category: 'vector-db',
  scores: { performance: 75, community: 90, maturity: 85, security: 90 },
  costs: { license: 'oss', operational: 4, learning: 3 },
  constraints: { incompatibleWith: [], requires: ['postgresql'] },
  metrics: { community: 85, maturity: 80, performance: 75, security: 90 },
});

selector.registerOption({
  id: 'qdrant', name: 'Qdrant', version: '1.9.0',
  category: 'vector-db',
  scores: { performance: 90, community: 75, maturity: 65, security: 75 },
  costs: { license: 'oss', operational: 3, learning: 3 },
  constraints: { incompatibleWith: [], requires: [] },
  metrics: { community: 75, maturity: 65, performance: 90, security: 75 },
});

selector.registerOption({
  id: 'chroma', name: 'ChromaDB', version: '0.4.0',
  category: 'vector-db',
  scores: { performance: 60, community: 80, maturity: 50, security: 55 },
  costs: { license: 'oss', operational: 2, learning: 2 },
  constraints: { incompatibleWith: [], requires: [] },
  metrics: { community: 80, maturity: 50, performance: 60, security: 55 },
});

const result = selector.select('vector-db', {
  budget: 5000, teamSize: 5,
  existingStack: ['postgresql', 'redis', 'nats'],
  scale: 'prod', latency: 'low',
});
console.log(result.reasoning);
// Output: "Selected pgvector (score: 78.2%)"
```

### 4.2 API Contract Specifications

#### OpenAPI 3.1 Snippets

```yaml
openapi: 3.1.0
info:
  title: IDEIA Agent API
  version: 1.0.0
servers:
  - url: https://api.ideia.app/v1

paths:
  /agents:
    post:
      summary: Criar novo agente
      operationId: createAgent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, role]
              properties:
                name:
                  type: string
                  minLength: 3
                  maxLength: 64
                role:
                  type: string
                  enum: [analyst, architect, programmer, reviewer, tester, devops]
                autonomy_level:
                  type: integer
                  minimum: 0
                  maximum: 4
                  default: 1
      responses:
        '201':
          description: Agent created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Agent'
        '400':
          $ref: '#/components/responses/ValidationError'
        '429':
          $ref: '#/components/responses/RateLimited'

  /agents/{agentId}/execute:
    post:
      summary: Executar tarefa no agente
      parameters:
        - name: agentId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [task]
              properties:
                task:
                  type: object
                  properties:
                    type:
                      type: string
                      enum: [code, review, analyze, test, deploy]
                    description:
                      type: string
                      maxLength: 2000
      responses:
        '202':
          description: Task accepted
          headers:
            Location:
              schema:
                type: string
                format: uri
          content:
            application/json:
              schema:
                type: object
                properties:
                  taskId: { type: string, format: uuid }
                  status: { type: string, enum: [queued, running] }
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    Agent:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        role: { type: string }
        autonomy_level: { type: integer }
        status: { type: string, enum: [idle, working, error] }
        created_at: { type: string, format: date-time }

  responses:
    ValidationError:
      description: Validation error
      content:
        application/json:
          schema:
            type: object
            properties:
              code: { type: string, example: VALIDATION_ERROR }
              message: { type: string }
              errors: { type: array, items: { type: object } }
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              code: { type: string, example: NOT_FOUND }
              message: { type: string }
    RateLimited:
      description: Too many requests
      content:
        application/json:
          schema:
            type: object
            properties:
              code: { type: string, example: RATE_LIMITED }
              retryAfter: { type: integer }
```

#### AsyncAPI Event Schemas

```yaml
asyncapi: 2.6.0
info:
  title: IDEIA Agent Events
  version: 1.0.0

channels:
  agent.task.created:
    publish:
      message:
        name: AgentTaskCreated
        payload:
          type: object
          required: [taskId, agentId, taskType, timestamp]
          properties:
            taskId: { type: string, format: uuid }
            agentId: { type: string, format: uuid }
            taskType: { type: string, enum: [code, review, analyze] }
            description: { type: string }
            priority: { type: integer, minimum: 1, maximum: 5 }
            timestamp: { type: string, format: date-time }

  agent.task.completed:
    publish:
      message:
        name: AgentTaskCompleted
        payload:
          type: object
          required: [taskId, result, timestamp]
          properties:
            taskId: { type: string, format: uuid }
            result:
              type: object
              properties:
                status: { type: string, enum: [success, failure, partial] }
                summary: { type: string }
                metrics:
                  type: object
                  properties:
                    duration_ms: { type: integer }
                    tokens_used: { type: integer }
                    confidence: { type: number, minimum: 0, maximum: 1 }
            timestamp: { type: string, format: date-time }

  agent.progress:
    publish:
      message:
        name: AgentProgress
        payload:
          type: object
          required: [agentId, stage, progress, timestamp]
          properties:
            agentId: { type: string, format: uuid }
            stage: { type: string, enum: [analysing, planning, coding, reviewing, testing, delivering] }
            progress: { type: number, minimum: 0, maximum: 100 }
            message: { type: string }
            timestamp: { type: string, format: date-time }
```

#### TypeScript Interfaces (Contracts)

```typescript
// Core integration contracts for IDEIA

interface NatsEventBusContract {
  connect(url: string, options?: NatsConnectionOptions): Promise<NatsConnection>;
  publish<T>(subject: string, data: T, options?: PublishOptions): Promise<void>;
  subscribe<T>(subject: string, handler: (msg: NatsMessage<T>) => void): Promise<Subscription>;
  request<T>(subject: string, data: unknown, timeout?: number): Promise<T>;
}

interface NatsConnectionOptions {
  token?: string;
  timeout?: number;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface NatsMessage<T> {
  subject: string;
  data: T;
  reply?: string;
  timestamp: number;
}

interface LlmProviderContract {
  generate(options: LlmGenerateOptions): Promise<LlmResponse>;
  stream(options: LlmGenerateOptions): AsyncIterable<LlmChunk>;
  embed(text: string): Promise<number[]>;
}

interface LlmGenerateOptions {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  tools?: LlmTool[];
}

interface LlmResponse {
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
  usage: { promptTokens: number; completionTokens: number };
}

interface AgentRuntimeContract {
  registerAgent(config: AgentConfig): Promise<string>;
  executeTask(agentId: string, task: AgentTask): Promise<TaskResult>;
  getStatus(agentId: string): Promise<AgentStatus>;
  setAutonomyLevel(agentId: string, level: number): Promise<void>;
}

interface AgentConfig {
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  autonomyLevel: number;
  model: string;
}

interface AgentTask {
  id: string;
  type: string;
  description: string;
  context: Record<string, unknown>;
}
```

### 4.3 Migration Automation Scripts

#### Detect Current Versions

```powershell
# scripts/migration/detect-versions.ps1
Write-Host "=== IDEIA Technology Version Detector ===" -ForegroundColor Cyan

$checks = @(
    @{ Name = "Node.js"; Command = "node --version" },
    @{ Name = "pnpm"; Command = "pnpm --version" },
    @{ Name = "Rust"; Command = "rustc --version" },
    @{ Name = "Docker"; Command = "docker --version" },
    @{ Name = "NATS"; Command = "nats --version" }
)

$results = @{}
foreach ($check in $checks) {
    try {
        $version = Invoke-Expression $check.Command
        $results[$check.Name] = $version.Trim()
        Write-Host "[OK] $($check.Name): $($version.Trim())" -ForegroundColor Green
    } catch {
        $results[$check.Name] = "NOT_FOUND"
        Write-Host "[WARN] $($check.Name): Not found" -ForegroundColor Yellow
    }
}

$results | ConvertTo-Json | Out-File "version-report.json"
Write-Host "Report saved to version-report.json" -ForegroundColor Cyan
```

#### Compatibility Check

```powershell
# scripts/migration/check-compatibility.ps1
param([string]$ReportPath = "compatibility-report.json")

Write-Host "=== IDEIA Compatibility Check ===" -ForegroundColor Cyan

$compatibilityMatrix = @{
    "tauri" = @{
        minNodeVersion = "18.0.0"
        minRustVersion = "1.75.0"
    }
    "nats.ws" = @{
        minNodeVersion = "18.0.0"
        compatibleNatsVersion = ">= 2.9.0"
    }
}

$report = @{
    timestamp = (Get-Date -Format "o")
    checks = @()
    passed = $true
}

# Node.js check
try {
    $nodeVer = node --version
    $minNode = "18.0.0"
    if ([version]$nodeVer.TrimStart('v') -lt [version]$minNode) {
        $report.checks += @{ check = "Node.js"; status = "FAIL"; message = "$nodeVer < $minNode required" }
        $report.passed = $false
    } else {
        $report.checks += @{ check = "Node.js"; status = "PASS"; message = "$nodeVer >= $minNode" }
    }
} catch {
    $report.checks += @{ check = "Node.js"; status = "ERROR"; message = "Node.js not found" }
    $report.passed = $false
}

# Rust check
try {
    $rustVer = rustc --version
    if ($rustVer -match "(\d+\.\d+\.\d+)") {
        $ver = [version]$Matches[1]
        if ($ver -lt [version]"1.75.0") {
            $report.checks += @{ check = "Rust"; status = "FAIL"; message = "$ver < 1.75.0" }
            $report.passed = $false
        } else {
            $report.checks += @{ check = "Rust"; status = "PASS"; message = "$ver >= 1.75.0" }
        }
    }
} catch {
    $report.checks += @{ check = "Rust"; status = "ERROR"; message = "Rust not found" }
    $report.passed = $false
}

# NATS check
try {
    $natsVer = nats --version
    $report.checks += @{ check = "NATS"; status = "PASS"; message = "$natsVer" }
} catch {
    $report.checks += @{ check = "NATS"; status = "WARN"; message = "NATS CLI not found" }
}

$report | ConvertTo-Json -Depth 10 | Out-File $ReportPath
Write-Host "Compatibility report: $ReportPath"
Write-Host "Overall: $(if($report.passed) { 'PASS' } else { 'FAIL' })"
```

#### Schema Migration Runner

```powershell
# scripts/migration/run-schema-migration.ps1
param(
    [Parameter(Mandatory = $true)]
    [string]$MigrationDir,
    [string]$Target = "postgresql://localhost:5432/ideia",
    [switch]$DryRun
)

Write-Host "=== IDEIA Schema Migration ===" -ForegroundColor Cyan
Write-Host "Target: $Target"
if ($DryRun) { Write-Host "MODE: Dry Run (no changes)" -ForegroundColor Yellow }

$migrations = Get-ChildItem -Path $MigrationDir -Filter "*.sql" | Sort-Object Name

foreach ($migration in $migrations) {
    Write-Host "Processing: $($migration.Name)" -ForegroundColor Gray
    if (-not $DryRun) {
        $sql = Get-Content $migration.FullName -Raw
        try {
            $sql | psql $Target 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Applied" -ForegroundColor Green
            } else {
                Write-Host "  [FAIL] Error applying" -ForegroundColor Red
            }
        } catch {
            Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        $sql = Get-Content $migration.FullName -Raw
        Write-Host "  [DRY-RUN] Would apply: $($sql.Substring(0, [Math]::Min($sql.Length, 150)))..." -ForegroundColor Cyan
    }
}
```

#### Post-Migration Health Check

```powershell
# scripts/migration/verify-health.ps1
param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$NatsUrl = "nats://localhost:4222"
)

Write-Host "=== IDEIA Post-Migration Health Check ===" -ForegroundColor Cyan

$tests = @()
$passed = 0
$failed = 0

# API Health
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/health" -Method Get -TimeoutSec 10
    $tests += @{ Name = "API Health"; Status = "PASS"; Detail = "$($response.status)" }
    $passed++
} catch {
    $tests += @{ Name = "API Health"; Status = "FAIL"; Detail = $_.Exception.Message }
    $failed++
}

# API Readiness
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/health/ready" -Method Get -TimeoutSec 10
    $tests += @{ Name = "API Readiness"; Status = "PASS"; Detail = "Ready" }
    $passed++
} catch {
    $tests += @{ Name = "API Readiness"; Status = "FAIL"; Detail = $_.Exception.Message }
    $failed++
}

# Database
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/health/db" -Method Get -TimeoutSec 10
    $tests += @{ Name = "Database"; Status = "PASS"; Detail = "$($response.latency_ms)ms" }
    $passed++
} catch {
    $tests += @{ Name = "Database"; Status = "FAIL"; Detail = $_.Exception.Message }
    $failed++
}

foreach ($test in $tests) {
    $color = if ($test.Status -eq "PASS") { 'Green' } else { 'Red' }
    Write-Host "[$($test.Status)] $($test.Name): $($test.Detail)" -ForegroundColor $color
}

Write-Host "--- Summary ---"
Write-Host "Passed: $passed / $($tests.Count)" -ForegroundColor Green
Write-Host "Failed: $failed / $($tests.Count)" -ForegroundColor Red

if ($failed -gt 0) { exit 1 }
```

#### Rollback Procedure

```powershell
# scripts/migration/rollback.ps1
param(
    [string]$Version = "previous",
    [switch]$Confirm
)

Write-Host "=== IDEIA Rollback Procedure ===" -ForegroundColor Red
Write-Host "Target: $Version"
if (-not $Confirm) {
    Write-Host "Use -Confirm to proceed" -ForegroundColor Yellow
    exit 0
}

$steps = @(
    @{ Step = 1; Action = "Stop services"; Command = "docker compose down" },
    @{ Step = 2; Action = "Restore DB"; Command = "psql -f ./backups/pre-migration.sql" },
    @{ Step = 3; Action = "Restore binaries"; Command = "cp -r ./releases/$Version/dist ./dist" },
    @{ Step = 4; Action = "Restore config"; Command = "cp ./releases/$Version/config/* ./config/" },
    @{ Step = 5; Action = "Start services"; Command = "docker compose up -d" },
    @{ Step = 6; Action = "Verify health"; Command = "powershell ./scripts/verify-health.ps1" },
    @{ Step = 7; Action = "Notify team"; Command = "echo 'Rollback to $Version complete'" }
)

foreach ($step in $steps) {
    Write-Host "[Step $($step.Step)/7] $($step.Action)..."
    Invoke-Expression $step.Command
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Host "  FAILED at step $($step.Step)" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK" -ForegroundColor Green
}

Write-Host "Rollback to $Version complete." -ForegroundColor Green
```
