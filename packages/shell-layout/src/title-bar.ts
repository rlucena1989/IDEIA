import { ITitleBar } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('title-bar');

export class DefaultTitleBar implements ITitleBar {
  private _title = 'IDEIA';
  private _icon = '';
  private _visible = true;

  setTitle(title: string): void {
    this._title = title;
  }

  setIcon(iconClass: string): void {
    this._icon = iconClass;
  }

  show(): void {
    this._visible = true;
  }

  hide(): void {
    this._visible = false;
  }

  getTitle(): string {
    return this._title;
  }

  getIcon(): string {
    return this._icon;
  }

  isVisible(): boolean {
    return this._visible;
  }
}
