import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IBreadcrumbs, BreadcrumbSegment } from './types';
const logger = createLogger('breadcrumbs');

export class DefaultBreadcrumbs implements IBreadcrumbs {
  private path: BreadcrumbSegment[] = [];
  private onSelectedEmitter = new Emitter<BreadcrumbSegment>();

  get onBreadcrumbSelected() { return this.onSelectedEmitter.event; }

  setPath(path: BreadcrumbSegment[]): void {
    this.path = path;
  }

  getPath(): BreadcrumbSegment[] {
    return [...this.path];
  }

  selectSegment(segment: BreadcrumbSegment): void {
    const idx = this.path.indexOf(segment);
    if (idx !== -1) {
      this.path = this.path.slice(0, idx + 1);
      this.onSelectedEmitter.fire(segment);
    }
  }

  clear(): void {
    this.path = [];
  }
}
