import type { BrowserAction } from './browser-agent';
import { createLogger } from '@ideia/logger';

export interface SessionAction {
  action: BrowserAction;
  result?: string;
  error?: string;
}

export interface Session {
  id: string;
  startTime: number;
  endTime: number;
  actions: SessionAction[];
}

export class SessionRecorder {
  private actions: SessionAction[] = [];
  private startTime = 0;
  private endTime = 0;
  private recording = false;
  private sessionId = '';

  startRecording(): void {
    this.actions = [];
    this.startTime = Date.now();
    this.endTime = 0;
    this.recording = true;
    this.sessionId = `session_${this.startTime}`;
  }

  stopRecording(): Session {
    this.endTime = Date.now();
    this.recording = false;
    return this.getSession();
  }

  recordAction(action: BrowserAction, result?: string, error?: string): void {
    if (!this.recording) {
      return;
    }
    this.actions.push({ action, result, error });
  }

  isRecording(): boolean {
    return this.recording;
  }

  getSession(): Session {
    return {
      id: this.sessionId,
      startTime: this.startTime,
      endTime: this.endTime,
      actions: [...this.actions],
    };
  }

  replay(session: Session): SessionAction[] {
    return session.actions.map((step) => ({
      action: { ...step.action, timestamp: Date.now() },
      result: step.result,
      error: step.error,
    }));
  }

  exportToScript(session: Session): string {
    const lines: string[] = [];
    lines.push('// IDEIA Browser Session Replay');
    lines.push(`// Session: ${session.id}`);
    lines.push(`// Duration: ${session.endTime - session.startTime}ms`);
    lines.push(`// Actions: ${session.actions.length}`);
    lines.push('');

    for (const step of session.actions) {
      const a = step.action;
      switch (a.type) {
        case 'navigate':
          lines.push(`await browser.navigate("${a.url}");`);
          break;
        case 'click':
          lines.push(`await browser.click("${a.selector}");`);
          break;
        case 'type':
          lines.push(`await browser.type("${a.selector}", "${a.text}");`);
          break;
        case 'extract':
          lines.push(`const text = await browser.extract("${a.selector}");`);
          break;
        case 'screenshot':
          lines.push('await browser.screenshot();');
          break;
        case 'executeScript':
          lines.push(`await browser.executeScript(${JSON.stringify(a.code)});`);
          break;
      }
    }

    return lines.join('\n');
  }
}
