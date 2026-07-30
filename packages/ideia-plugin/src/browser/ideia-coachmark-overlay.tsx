import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CoachmarkManager, Coachmark } from '@ideia/onboarding-wizard';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface CoachmarkOverlayProps {
  manager: CoachmarkManager;
  onDismiss?: (id: string) => void;
}

interface CoachmarkState {
  current: Coachmark | null;
  queue: Coachmark[];
  position: { top: number; left: number } | null;
}

export class IDEIA_CoachmarkOverlay {
  private root: Root | undefined;
  private container: HTMLDivElement | null = null;
  private state: CoachmarkState = { current: null, queue: [], position: null };
  private manager: CoachmarkManager;
  private onDismiss?: (id: string) => void;

  constructor(props: CoachmarkOverlayProps) {
    this.manager = props.manager;
    this.onDismiss = props.onDismiss;
    this.manager.setOnShow((coachmark: Coachmark) => this.enqueue(coachmark));
  }

  mount(container: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'ideia-coachmark-overlay';
    this.container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    container.appendChild(this.container);
    this.root = createRoot(this.container);
    this.render();
  }

  unmount(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.container = null;
  }

  private enqueue(coachmark: Coachmark): void {
    this.state.queue.push(coachmark);
    if (!this.state.current) {
      this.showNext();
    }
  }

  private showNext(): void {
    if (this.state.queue.length === 0) {
      this.state.current = null;
      this.state.position = null;
      this.render();
      return;
    }
    const coachmark = this.state.queue.shift();
    if (!coachmark) return;
    this.state.current = coachmark;
    this.state.position = this.calculatePosition(coachmark);
    this.render();
  }

  private calculatePosition(coachmark: Coachmark): { top: number; left: number } | null {
    const target = document.querySelector(coachmark.target);
    if (!target) return { top: 100, left: 100 };

    const rect = target.getBoundingClientRect();
    const gap = 12;
    const placement: Placement = coachmark.placement || 'bottom';

    switch (placement) {
      case 'top':
        return { top: rect.top - gap, left: rect.left + rect.width / 2 };
      case 'bottom':
        return { top: rect.bottom + gap, left: rect.left + rect.width / 2 };
      case 'left':
        return { top: rect.top + rect.height / 2, left: rect.left - gap };
      case 'right':
        return { top: rect.top + rect.height / 2, left: rect.right + gap };
    }
  }

  private handleDismiss(): void {
    if (!this.state.current) return;
    const id = this.state.current.id;
    this.manager.dismiss(id);
    if (this.onDismiss) this.onDismiss(id);
    this.showNext();
  }

  private render(): void {
    if (!this.root) return;
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement | null {
    const { current } = this.state;
    if (!current) return null;

    return (
      <>
        <div style={styles.backdrop} onClick={() => this.handleDismiss()} />
        <CoachmarkPopup
          coachmark={current}
          position={this.state.position}
          onDismiss={() => this.handleDismiss()}
          onNext={() => this.showNext()}
        />
      </>
    );
  }
}

interface CoachmarkPopupProps {
  coachmark: Coachmark;
  position: { top: number; left: number } | null;
  onDismiss: () => void;
  onNext: () => void;
}

const CoachmarkPopup: React.FC<CoachmarkPopupProps> = ({ coachmark, position, onDismiss }) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const placement: Placement = coachmark.placement || 'bottom';
  const isHorizontal = placement === 'left' || placement === 'right';

  const popupPositionStyle: React.CSSProperties = position
    ? placement === 'top' ? { bottom: window.innerHeight - position.top, left: position.left }
    : placement === 'bottom' ? { top: position.top, left: position.left }
    : placement === 'left' ? { right: window.innerWidth - position.left, top: position.top }
    : { left: position.left, top: position.top }
    : { top: '50%', left: '50%' };

  const popupTransform = position
    ? visible
      ? (isHorizontal ? 'translateY(-50%)' : 'translateX(-50%)')
      : (isHorizontal ? 'translateY(-50%) translateX(10px)' : 'translateX(-50%) translateY(10px)')
    : visible ? 'translate(-50%, -50%)' : 'translate(-50%, -40%)';

  const popupStyle: React.CSSProperties = {
    ...styles.popup,
    ...popupPositionStyle,
    transform: popupTransform,
    opacity: visible ? 1 : 0,
  };

  return (
    <div style={popupStyle}>
      <div style={styles.arrow} data-placement={placement} />
      <div style={styles.header}>
        <span style={styles.feature}>{coachmark.feature}</span>
        <button style={styles.skipBtn} onClick={onDismiss} aria-label="Skip coachmark">Skip</button>
      </div>
      <h4 style={styles.title}>{coachmark.title}</h4>
      <p style={styles.description}>{coachmark.description}</p>
      <div style={styles.footer}>
        <button style={styles.gotItBtn} onClick={onDismiss} aria-label="Got it, dismiss coachmark">
          Got it
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.4)', pointerEvents: 'auto',
    zIndex: 9998,
  },
  popup: {
    position: 'fixed',
    pointerEvents: 'auto',
    zIndex: 10000,
    background: 'var(--theia-editorWidget-background, #252526)',
    border: '1px solid var(--theia-border-color, #3c3c3c)',
    borderRadius: '8px',
    padding: '16px',
    maxWidth: '320px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    fontFamily: 'var(--theia-ui-font-family, system-ui, sans-serif)',
    color: 'var(--theia-foreground, #cccccc)',
  },
  arrow: {},
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '8px',
  },
  feature: {
    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '1px', opacity: 0.5,
  },
  skipBtn: {
    background: 'none', border: 'none', color: 'var(--theia-foreground, #ccc)',
    cursor: 'pointer', fontSize: '11px', opacity: 0.6,
  },
  title: {
    fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0',
    color: 'var(--theia-foreground, #e0e0e0)',
  },
  description: {
    fontSize: '12px', lineHeight: '1.5', margin: '0 0 12px 0',
    opacity: 0.8,
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: '8px',
  },
  gotItBtn: {
    padding: '6px 16px', fontSize: '12px', fontWeight: 600,
    background: 'var(--theia-button-background, #3b82f6)',
    color: 'var(--theia-button-foreground, #fff)',
    border: 'none', borderRadius: '4px', cursor: 'pointer',
  },
};
