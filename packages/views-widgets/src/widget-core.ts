import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IWidget, WidgetTitle, WidgetResizeEvent, EmptyStateConfig, SkeletonConfig, LoadingState } from './types';

const BUILT_IN_EMPTY_STATES: Record<string, EmptyStateConfig> = {
  'no-chat': { icon: 'chat', title: 'No Conversations', description: 'Start a new chat to begin working with IDEIA agents.', action: 'ideia:focus.chat', actionLabel: 'Open Chat', tips: ['Try asking "Create a new project"', 'Use @agent to invoke specific agents'] },
  'no-dashboard': { icon: 'dashboard', title: 'No Dashboard Data', description: 'Configure your project to see metrics and health data.', action: 'ideia:focus.dashboard', actionLabel: 'Open Dashboard', tips: ['Run a project scan first', 'Check configuration settings'] },
  'no-config': { icon: 'settings', title: 'No Configuration', description: 'Set up your IDEIA configuration to get started.', action: 'ideia:config.open', actionLabel: 'Open Config', tips: ['Use profiles for quick setup', 'Configure autonomy level'] },
  'no-tasks': { icon: 'tasks', title: 'No Tasks Yet', description: 'Create a task to start tracking your work.', action: 'ideia:task.create', actionLabel: 'New Task', tips: ['Tasks can be automated', 'Set due dates for tracking'] },
  'no-results': { icon: 'search', title: 'No Results Found', description: 'Try adjusting your search terms or filters.', tips: ['Use quotes for exact matches', 'Try different keywords'] },
  'no-history': { icon: 'history', title: 'No History', description: 'Your activity history will appear here as you use IDEIA.', tips: ['History is automatically tracked', 'Use filters to find past activity'] },
};

export class BaseWidget implements IWidget {
  readonly id: string;
  title: WidgetTitle;
  visible = true;
  protected disposed = false;
  protected emptyState?: EmptyStateConfig;
  protected skeletonConfig?: SkeletonConfig;
  protected _loadingState: LoadingState = 'loaded';

  protected onActivatedEmitter = new Emitter<void>();
  protected onCloseEmitter = new Emitter<void>();
  protected onDisposeEmitter = new Emitter<void>();
  protected onResizeEmitter = new Emitter<WidgetResizeEvent>();

  get onActivated() { return this.onActivatedEmitter.event; }
  get onClose() { return this.onCloseEmitter.event; }
  get onDispose() { return this.onDisposeEmitter.event; }
  get onResize() { return this.onResizeEmitter.event; }

  get loadingState(): LoadingState { return this._loadingState; }

  constructor(id: string, title: WidgetTitle) {
    this.id = id;
    this.title = title;
  }

  activate(): void {
    if (!this.disposed) {
      this.onActivatedEmitter.fire(void 0);
    }
  }

  close(): void {
    if (!this.disposed) {
      this.onCloseEmitter.fire(void 0);
      this.dispose();
    }
  }

  dispose(): void {
    if (!this.disposed) {
      this.disposed = true;
      this.onDisposeEmitter.fire(void 0);
      this.onActivatedEmitter.dispose();
      this.onCloseEmitter.dispose();
      this.onDisposeEmitter.dispose();
      this.onResizeEmitter.dispose();
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  protected handleResize(width: number, height: number): void {
    this.onResizeEmitter.fire({ width, height });
  }

  getEmptyState(viewId?: string): EmptyStateConfig {
    if (this.emptyState) return this.emptyState;
    const key = viewId ?? this.id;
    return BUILT_IN_EMPTY_STATES[key] ?? BUILT_IN_EMPTY_STATES['no-results'];
  }

  setEmptyState(config: EmptyStateConfig): void {
    this.emptyState = config;
  }

  setLoading(loading: boolean): void {
    this._loadingState = loading ? 'loading' : 'loaded';
  }

  getSkeletonConfig(): SkeletonConfig | undefined {
    if (this.skeletonConfig) return this.skeletonConfig;
    return { type: 'text', lines: 3 };
  }

  setSkeletonConfig(config: SkeletonConfig): void {
    this.skeletonConfig = config;
  }

  renderEmptyState(viewId?: string): string {
    const state = this.getEmptyState(viewId);
    const parts: string[] = [];
    parts.push(`<div class="ideia-empty-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;">`);
    parts.push(`  <div class="ideia-empty-state-icon" style="font-size:48px;margin-bottom:16px;opacity:0.5;">${state.icon}</div>`);
    parts.push(`  <h3 style="margin:0 0 8px 0;font-size:18px;color:#d4d4d4;">${state.title}</h3>`);
    parts.push(`  <p style="margin:0 0 16px 0;font-size:13px;color:#888;max-width:400px;">${state.description}</p>`);
    if (state.actionLabel && state.action) {
      parts.push(`  <button data-action="${state.action}" style="padding:8px 16px;background:#007acc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">${state.actionLabel}</button>`);
    }
    if (state.tips && state.tips.length > 0) {
      parts.push(`  <div style="margin-top:16px;font-size:11px;color:#666;">`);
      for (const tip of state.tips) {
        parts.push(`    <div style="margin:2px 0;">💡 ${tip}</div>`);
      }
      parts.push(`  </div>`);
    }
    parts.push(`</div>`);
    return parts.join('\n');
  }

  renderSkeleton(): string {
    const config = this.skeletonConfig ?? { type: 'text', lines: 3 };
    const parts: string[] = [];
    const pulse = 'animation:pulse 1.5s ease-in-out infinite;';
    parts.push(`<style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>`);
    parts.push(`<div class="ideia-skeleton" style="padding:16px;">`);
    if (config.type === 'text') {
      const lines = config.lines ?? 3;
      for (let i = 0; i < lines; i++) {
        const w = 60 + Math.random() * 40;
        parts.push(`  <div style="${pulse}height:12px;background:#333;border-radius:4px;margin-bottom:8px;width:${w}%;"></div>`);
      }
    } else if (config.type === 'card') {
      parts.push(`  <div style="${pulse}height:120px;background:#2d2d2d;border-radius:8px;border:1px solid #333;">`);
      parts.push(`    <div style="padding:12px;border-bottom:1px solid #333;"><div style="height:14px;width:40%;background:#444;border-radius:4px;"></div></div>`);
      parts.push(`    <div style="padding:12px;"><div style="height:60px;background:#333;border-radius:4px;"></div></div>`);
      parts.push(`    <div style="padding:12px;border-top:1px solid #333;"><div style="height:12px;width:60%;background:#444;border-radius:4px;"></div></div>`);
      parts.push(`  </div>`);
    } else if (config.type === 'chart') {
      parts.push(`  <div style="${pulse}height:160px;background:#2d2d2d;border-radius:8px;display:flex;align-items:flex-end;padding:16px;gap:4px;">`);
      for (let i = 0; i < 12; i++) {
        const h = 20 + Math.random() * 120;
        parts.push(`    <div style="flex:1;height:${h}px;background:#444;border-radius:2px;"></div>`);
      }
      parts.push(`  </div>`);
    } else if (config.type === 'table') {
      const rows = config.lines ?? 4;
      parts.push(`  <div style="border:1px solid #333;border-radius:8px;overflow:hidden;">`);
      parts.push(`    <div style="display:flex;padding:8px 12px;background:#2d2d2d;border-bottom:1px solid #333;">`);
      for (let c = 0; c < 3; c++) {
        parts.push(`      <div style="flex:1;height:12px;background:#444;border-radius:4px;margin:0 4px;"></div>`);
      }
      parts.push(`    </div>`);
      for (let r = 0; r < rows; r++) {
        parts.push(`    <div style="display:flex;padding:8px 12px;border-bottom:1px solid #333;">`);
        for (let c = 0; c < 3; c++) {
          const w = 40 + Math.random() * 50;
          parts.push(`      <div style="${pulse}flex:1;height:10px;background:#333;border-radius:4px;margin:0 4px;width:${w}%;"></div>`);
        }
        parts.push(`    </div>`);
      }
      parts.push(`  </div>`);
    }
    parts.push(`</div>`);
    return parts.join('\n');
  }
}
