import { IProgressService, IProgressIndicator, ProgressOptions } from './types';

export class ProgressService implements IProgressService {
  private indicators = new Map<string, ProgressIndicator>();

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
}

class ProgressIndicator implements IProgressIndicator {
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
