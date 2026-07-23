import { INavigationLocation, INavigationService, EditorSelection } from './types';

export class DefaultNavigationService implements INavigationService {
  private backStack: INavigationLocation[] = [];
  private forwardStack: INavigationLocation[] = [];
  private maxStackSize = 50;

  goBack(): Promise<void> {
    const location = this.backStack.pop();
    if (location) {
      this.forwardStack.push(location);
    }
    return Promise.resolve();
  }

  goForward(): Promise<void> {
    const location = this.forwardStack.pop();
    if (location) {
      this.backStack.push(location);
    }
    return Promise.resolve();
  }

  canGoBack(): boolean {
    return this.backStack.length > 0;
  }

  canGoForward(): boolean {
    return this.forwardStack.length > 0;
  }

  navigateTo(uri: string, selection: EditorSelection): void {
    const location: INavigationLocation = {
      uri,
      selection,
      timestamp: Date.now(),
    };
    this.backStack.push(location);
    if (this.backStack.length > this.maxStackSize) {
      this.backStack.shift();
    }
    this.forwardStack = [];
  }

  clear(): void {
    this.backStack = [];
    this.forwardStack = [];
  }

  getBackStack(): INavigationLocation[] {
    return [...this.backStack];
  }

  getForwardStack(): INavigationLocation[] {
    return [...this.forwardStack];
  }
}
