import { IProgressService, IProgressIndicator, ProgressOptions, SkeletonConfig } from './types';
import { createLogger } from '@ideia/logger';

export class ProgressService implements IProgressService {
  private indicators = new Map<string, ProgressIndicator>();
  private skeletons = new Map<string, string>();

  show(options: ProgressOptions): IProgressIndicator {
    const indicator = new ProgressIndicator(options);
    this.indicators.set(indicator.id, indicator);
    return indicator;
  }

  hide(id: string): void {
    const indicator = this.indicators.get(id);
    if (indicator) {
      indicator.done();
      this.indicators.delete(id);
    }
  }

  showSkeleton(widgetId: string, config?: SkeletonConfig): string {
    const cfg = config ?? { type: 'text', lines: 3 };
    const html = this.renderSkeletonHtml(cfg);
    this.skeletons.set(widgetId, html);
    return html;
  }

  hideSkeleton(widgetId: string): boolean {
    return this.skeletons.delete(widgetId);
  }

  showProgress(message: string, current?: number, total?: number): string {
    const pct = total ? Math.round((current ?? 0) / total * 100) : 0;
    const barWidth = 30;
    const filled = Math.round(barWidth * pct / 100);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `\r${bar} ${pct}% ${message}`;
  }

  showSpinner(message: string, frame?: number): string {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const idx = (frame ?? 0) % frames.length;
    return `${frames[idx]} ${message}`;
  }

  showDryRun(diff: Array<{ path: string; oldValue?: string; newValue?: string }>): string {
    const parts: string[] = ['\n--- Dry Run ---\n'];
    for (const d of diff) {
      if (d.oldValue !== undefined) {
        parts.push(`  - ${d.path}: ${d.oldValue} → ${d.newValue ?? '(removed)'}`);
      } else {
        parts.push(`  + ${d.path}: ${d.newValue}`);
      }
    }
    parts.push(`\n${diff.length} change(s) would be applied.`);
    return parts.join('\n');
  }

  private renderSkeletonHtml(config: SkeletonConfig): string {
    const pulse = 'animation:skeleton-pulse 1.5s ease-in-out infinite;';
    const parts: string[] = [];
    parts.push(`<style>@keyframes skeleton-pulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>`);
    parts.push(`<div class="skeleton-container" style="padding:16px;">`);
    if (config.type === 'text') {
      const lines = config.lines ?? 3;
      for (let i = 0; i < lines; i++) {
        const w = 60 + Math.random() * 40;
        parts.push(`  <div style="${pulse}height:12px;background:#333;border-radius:4px;margin-bottom:8px;width:${w}%;"></div>`);
      }
    } else if (config.type === 'card') {
      parts.push(`  <div style="${pulse}height:120px;background:#2d2d2d;border-radius:8px;border:1px solid #333;padding:12px;">`);
      parts.push(`    <div style="height:14px;width:40%;background:#444;border-radius:4px;margin-bottom:12px;"></div>`);
      parts.push(`    <div style="height:60px;background:#333;border-radius:4px;"></div>`);
      parts.push(`  </div>`);
    }
    parts.push(`</div>`);
    return parts.join('\n');
  }
}

export class ProgressIndicator implements IProgressIndicator {
  readonly id: string;
  private _title: string;
  private _cancelled = false;
  private _done = false;

  constructor(options: ProgressOptions) {
    this.id = `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this._title = options.title || '';
  }

  report(progress: { message?: string; work?: { done: number; total: number } }): void {
    if (this._done || this._cancelled) return;
  }

  cancel(): void {
    this._cancelled = true;
  }

  done(): void {
    this._done = true;
  }

  isCancelled(): boolean {
    return this._cancelled;
  }
}
