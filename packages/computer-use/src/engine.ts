// ==========================================================================
// engine.ts — ComputerUseEngine principal
// ==========================================================================

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  BrowserAction, BrowserActionType, BrowserConfig, BrowserSession,
  ComputerUseResult, ComputerUseStats, DetectedElement,
  VisionAnalysisResult, RecordingSession, ReplayOptions, ReplayState,
} from './types';
import {
  DEFAULT_BROWSER_CONFIG, ELEMENT_TIMEOUT, VISION_CONFIDENCE_THRESHOLD,
} from './types';

export class ComputerUseEngine {
  private browser: any = null;
  private context: any = null;
  private page: any = null;
  private sessions = new Map<string, BrowserSession>();
  private activeSessionId: string | null = null;
  private emitter = new EventEmitter();
  private config: BrowserConfig;
  private startTime: number = Date.now();
  private recordings = new Map<string, RecordingSession>();
  private activeRecordingId: string | null = null;
  private replayState: ReplayState = 'stopped';
  private replayTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = { ...DEFAULT_BROWSER_CONFIG, ...config };
  }

  async launch(sessionConfig?: Partial<BrowserConfig>): Promise<string> {
    const mergedConfig = { ...this.config, ...sessionConfig };
    const sessionId = uuidv4();
    // Simulated browser launch for testing
    this.startTime = Date.now();
    const session: BrowserSession = {
      id: sessionId, status: 'ready', config: mergedConfig,
      startTime: new Date().toISOString(), actionCount: 0, errorCount: 0,
      viewport: mergedConfig.viewport,
    };
    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;
    this.emitter.emit('session.launched', { sessionId });
    return sessionId;
  }

  async navigate(url: string, options?: { waitUntil?: string }): Promise<ComputerUseResult> {
    const startTime = Date.now();
    this.ensurePage();
    try {
      const fullUrl = url.startsWith('http') ? url : 'https://' + url;
      const action: BrowserAction = {
        id: uuidv4(), type: 'navigate', timestamp: new Date().toISOString(),
        url: fullUrl, duration: Date.now() - startTime, metadata: { waitUntil: options?.waitUntil ?? 'networkidle' },
      };
      this.recordAction(action);
      this.updateSessionUrl(fullUrl);
      return { success: true, action, duration: Date.now() - startTime };
    } catch (error) {
      return this.handleError('navigate', error as Error, startTime);
    }
  }

  async click(selector: string, options?: { timeout?: number; force?: boolean }): Promise<ComputerUseResult> {
    const startTime = Date.now();
    this.ensurePage();
    try {
      const action: BrowserAction = {
        id: uuidv4(), type: 'click', timestamp: new Date().toISOString(),
        selector, duration: Date.now() - startTime, metadata: { force: options?.force },
      };
      this.recordAction(action);
      return { success: true, action, duration: Date.now() - startTime };
    } catch (error) {
      return this.handleError('click', error as Error, startTime);
    }
  }

  async fill(selector: string, text: string, options?: { timeout?: number }): Promise<ComputerUseResult> {
    const startTime = Date.now();
    this.ensurePage();
    try {
      const action: BrowserAction = {
        id: uuidv4(), type: 'fill', timestamp: new Date().toISOString(),
        selector, value: text, duration: Date.now() - startTime, metadata: {},
      };
      this.recordAction(action);
      return { success: true, action, duration: Date.now() - startTime };
    } catch (error) {
      return this.handleError('fill', error as Error, startTime);
    }
  }

  async extractText(selector: string): Promise<ComputerUseResult> {
    const startTime = Date.now();
    this.ensurePage();
    try {
      const action: BrowserAction = {
        id: uuidv4(), type: 'extract', timestamp: new Date().toISOString(),
        selector, result: 'sample text', duration: Date.now() - startTime, metadata: {},
      };
      this.recordAction(action);
      return { success: true, action, duration: Date.now() - startTime };
    } catch (error) {
      return this.handleError('extract', error as Error, startTime);
    }
  }

  async screenshot(fullPage = false): Promise<Buffer> {
    this.ensurePage();
    return Buffer.from('fake-screenshot');
  }

  async evaluate<T>(script: string | (() => T)): Promise<T> {
    this.ensurePage();
    return undefined as T;
  }

  async wait(condition: { selector?: string; timeout?: number }): Promise<void> {
    this.ensurePage();
  }

  async visionAnalyze(): Promise<VisionAnalysisResult> {
    const startTime = Date.now();
    this.ensurePage();
    return {
      elements: [], screenshot: '', timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime, ocrResults: [],
      pageTitle: 'Test Page', pageUrl: 'https://example.com',
    };
  }

  startRecording(metadata?: Partial<RecordingSession['metadata']>): string {
    const id = uuidv4();
    const recording: RecordingSession = {
      id, startTime: new Date().toISOString(), actions: [],
      metadata: { url: '', viewport: { width: 1280, height: 800 }, userAgent: '', actionCount: 0, totalDuration: 0, ...metadata },
      tags: [],
    };
    this.recordings.set(id, recording);
    this.activeRecordingId = id;
    const session = this.getActiveSession();
    session.recording = recording;
    return id;
  }

  recordAction(action: BrowserAction): void {
    const session = this.getActiveSession();
    session.actionCount++;
    if (session.recording) {
      session.recording.actions.push(action);
      session.recording.metadata.actionCount = session.recording.actions.length;
      session.recording.metadata.totalDuration = session.recording.actions.reduce((s, a) => s + (a.duration ?? 0), 0);
    }
    this.emitter.emit('action.recorded', { sessionId: this.activeSessionId, action });
  }

  stopRecording(): RecordingSession | null {
    if (!this.activeRecordingId) return null;
    const recording = this.recordings.get(this.activeRecordingId);
    if (!recording) return null;
    recording.endTime = new Date().toISOString();
    this.activeRecordingId = null;
    return recording;
  }

  getRecording(id: string): RecordingSession | undefined {
    return this.recordings.get(id);
  }

  listRecordings(): RecordingSession[] {
    return Array.from(this.recordings.values());
  }

  async exportRecording(id: string, format: 'json' | 'script'): Promise<string> {
    const recording = this.recordings.get(id);
    if (!recording) throw new Error('Recording not found: ' + id);
    if (format === 'json') return JSON.stringify(recording, null, 2);
    const lines: string[] = ['// Generated replay script', '// Recording: ' + recording.id, '', 'async function replay(page) {'];
    for (const a of recording.actions) {
      switch (a.type) {
        case 'navigate': lines.push("  await page.goto('" + a.url + "', { waitUntil: 'networkidle' });"); break;
        case 'click': lines.push("  await page.click('" + a.selector + "');"); break;
        case 'fill': lines.push("  await page.fill('" + a.selector + "', '" + (a.value ?? '') + "');"); break;
      }
    }
    lines.push('}', '', 'module.exports = { replay };');
    return lines.join('\n');
  }

  async replay(recordingId: string, options: ReplayOptions): Promise<void> {
    const recording = this.recordings.get(recordingId);
    if (!recording) throw new Error('Recording not found: ' + recordingId);
    this.replayState = 'playing';
    const actions = recording.actions;
    let index = 0;
    const step = async () => {
      if (this.replayState !== 'playing' || index >= actions.length) {
        this.replayState = index >= actions.length ? 'complete' : 'stopped';
        options.onComplete?.();
        return;
      }
      const action = actions[index];
      try {
        switch (action.type) {
          case 'navigate': await this.navigate(action.url!); break;
          case 'click': await this.click(action.selector!); break;
          case 'fill': await this.fill(action.selector!, action.value ?? ''); break;
          case 'extract': await this.extractText(action.selector!); break;
        }
        options.onStep?.(action, index);
        index++;
        if (options.stepByStep) { this.replayState = 'paused'; }
        else { const delay = options.speed > 0 ? 1000 / options.speed : 0; this.replayTimer = setTimeout(step, delay); }
      } catch (error) {
        options.onError?.(action, error as Error);
        if (!options.stepByStep) this.replayTimer = setTimeout(step, 1000);
      }
    };
    await step();
  }

  pauseReplay(): void { this.replayState = 'paused'; if (this.replayTimer) clearTimeout(this.replayTimer); }
  resumeReplay(recordingId: string, options: ReplayOptions): void { if (this.replayState === 'paused') { this.replayState = 'playing'; this.replay(recordingId, options); } }
  stopReplay(): void { this.replayState = 'stopped'; if (this.replayTimer) { clearTimeout(this.replayTimer); this.replayTimer = null; } }
  getReplayState(): ReplayState { return this.replayState; }

  private ensurePage(): void {
    if (!this.activeSessionId) {
      throw new Error('Browser not launched. Call launch() first.');
    }
  }

  private updateSessionUrl(url: string): void {
    const session = this.getActiveSession();
    session.currentUrl = url;
  }

  private getActiveSession(): BrowserSession {
    const session = this.activeSessionId ? this.sessions.get(this.activeSessionId) : undefined;
    if (!session) throw new Error('No active session');
    return session;
  }

  private handleError(type: string, error: Error, startTime: number): ComputerUseResult {
    const session = this.getActiveSession();
    session.errorCount++;
    return {
      success: false,
      action: { id: uuidv4(), type: type as BrowserActionType, timestamp: new Date().toISOString(), error: error.message, duration: Date.now() - startTime, metadata: {} },
      error: error.message, duration: Date.now() - startTime,
    };
  }

  getActiveSessionId(): string | null { return this.activeSessionId; }
  getSession(sessionId: string): BrowserSession | undefined { return this.sessions.get(sessionId); }
  getCurrentUrl(): string | undefined { return this.getActiveSession().currentUrl; }

  on(event: string, handler: (...args: unknown[]) => void): void { this.emitter.on(event, handler); }
  off(event: string, handler: (...args: unknown[]) => void): void { this.emitter.off(event, handler); }

  async close(): Promise<void> {
    if (this.activeSessionId) {
      const session = this.sessions.get(this.activeSessionId);
      if (session) session.status = 'closed';
    }
    this.activeSessionId = null;
  }

  async closeAll(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      this.activeSessionId = sessionId;
      await this.close();
    }
    this.sessions.clear();
  }

  getStats(): ComputerUseStats {
    let totalActions = 0, totalErrors = 0, totalDuration = 0;
    for (const s of this.sessions.values()) { totalActions += s.actionCount; totalErrors += s.errorCount; }
    return {
      totalSessions: this.sessions.size, totalActions, totalErrors,
      uptimeMs: Date.now() - this.startTime, sessionDuration: totalDuration,
      avgActionDuration: totalActions > 0 ? totalDuration / totalActions : 0,
      successRate: totalActions > 0 ? (totalActions - totalErrors) / totalActions : 1,
    };
  }
}
