import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';

interface ProgressiveLoaderProps {
  estimatedTime: number;
  message: string;
  onCancel?: () => void;
  container: HTMLElement;
}

interface ProgressiveLoaderState {
  stage: 'skeleton' | 'progress' | 'eta' | 'fallback';
  elapsed: number;
}

export class ProgressiveLoader {
  private root: Root | undefined;
  private startTime: number;
  private timer: ReturnType<typeof setInterval> | undefined;
  private estimatedTime: number;
  private message: string;
  private onCancel?: () => void;
  private container: HTMLElement;

  constructor(props: ProgressiveLoaderProps) {
    this.startTime = Date.now();
    this.estimatedTime = props.estimatedTime;
    this.message = props.message;
    this.onCancel = props.onCancel;
    this.container = props.container;
  }

  mount(): void {
    const div = document.createElement('div');
    div.id = 'ideia-progressive-loader';
    div.style.cssText = 'height:100%;display:flex;align-items:center;justify-content:center;';
    this.container.appendChild(div);
    this.root = createRoot(div);
    this.render();
    this.startTimer();
  }

  unmount(): void {
    this.clearTimer();
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  updateMessage(message: string): void {
    this.message = message;
    this.render();
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      this.render();
    }, 200);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private getStage(): ProgressiveLoaderState['stage'] {
    const elapsed = Date.now() - this.startTime;
    if (elapsed < 100) return 'skeleton';
    if (elapsed < 2000) return 'skeleton';
    if (elapsed < 5000) return 'progress';
    if (elapsed < 10000) return 'eta';
    return 'fallback';
  }

  private getProgress(): number {
    const elapsed = Date.now() - this.startTime;
    return Math.min(95, (elapsed / this.estimatedTime) * 100);
  }

  private getEta(): string {
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.estimatedTime - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    if (seconds < 60) return `~${seconds}s remaining`;
    return `~${Math.ceil(seconds / 60)}m ${seconds % 60}s remaining`;
  }

  render(): void {
    if (!this.root) return;
    const stage = this.getStage();
    const elapsed = Date.now() - this.startTime;
    const progress = this.getProgress();

    const component = this.renderStage(stage, elapsed, progress);
    this.root.render(component);
  }

  private renderStage(
    stage: ProgressiveLoaderState['stage'],
    elapsed: number,
    progress: number,
  ): React.ReactElement {
    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '32px',
      fontFamily: 'var(--theia-ui-font-family)',
      color: 'var(--theia-foreground)',
    };

    switch (stage) {
      case 'skeleton':
        return (
          <div style={containerStyle}>
            <div style={{
              width: '240px', height: '16px',
              background: 'var(--theia-editorWidget-background)',
              borderRadius: '4px', opacity: 0.3,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <div style={{
              width: '180px', height: '12px',
              background: 'var(--theia-editorWidget-background)',
              borderRadius: '4px', opacity: 0.2,
              animation: 'pulse 1.5s ease-in-out infinite 0.2s',
            }} />
            <div style={{ fontSize: '12px', opacity: 0.5 }}>
              {this.message}
            </div>
          </div>
        );

      case 'progress':
        return (
          <div style={containerStyle}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
              {this.message}
            </div>
            <div style={{
              width: '280px', height: '8px',
              background: 'var(--theia-editorWidget-background)',
              borderRadius: '4px', overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: 'var(--theia-button-background)',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: '11px', opacity: 0.5 }}>
              {Math.round(progress)}% complete
            </div>
          </div>
        );

      case 'eta':
        return (
          <div style={containerStyle}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {this.message}
            </div>
            <div style={{
              width: '280px', height: '8px',
              background: 'var(--theia-editorWidget-background)',
              borderRadius: '4px', overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: 'var(--theia-button-background)',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              {this.getEta()}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.5 }}>
              Elapsed: {Math.floor(elapsed / 1000)}s
            </div>
          </div>
        );

      case 'fallback':
        return (
          <div style={containerStyle}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theia-warningForeground)' }}>
              {this.message}
            </div>
            <div style={{
              width: '280px', height: '8px',
              background: 'var(--theia-editorWidget-background)',
              borderRadius: '4px', overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: 'var(--theia-warningForeground)',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: '13px', opacity: 0.8, textAlign: 'center' }}>
              This is taking longer than expected...
            </div>
            <div style={{ fontSize: '11px', opacity: 0.5 }}>
              Elapsed: {Math.floor(elapsed / 1000)}s
            </div>
            {this.onCancel && (
              <button
                onClick={this.onCancel}
                style={{
                  marginTop: '8px', padding: '6px 16px',
                  background: 'var(--theia-button-background)',
                  color: 'var(--theia-button-foreground)',
                  border: 'none', borderRadius: '4px',
                  cursor: 'pointer', fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            )}
          </div>
        );
    }
  }
}
