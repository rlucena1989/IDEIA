import { app, BrowserWindow } from 'electron';

export interface DeepLinkHandler {
  protocol: string;
  handler: (url: string) => void;
}

export class DeepLinkManager {
  private handlers = new Map<string, DeepLinkHandler>();
  private mainWindow?: BrowserWindow;

  constructor() {
    app.setAsDefaultProtocolClient('ideia');
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  register(handler: DeepLinkHandler): void {
    this.handlers.set(handler.protocol, handler);
  }

  handle(url: string): void {
    const parsed = new URL(url);
    const protocol = parsed.protocol.replace(':', '');

    const handler = this.handlers.get(protocol);
    if (handler) {
      handler.handler(url);
    } else {
      this.handleDefault(url);
    }

    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  private handleDefault(url: string): void {
    const action = url.replace('ideia://', '').split('?')[0];
    const params = Object.fromEntries(new URLSearchParams(url.split('?')[1] || ''));

    if (this.mainWindow) {
      this.mainWindow.webContents.send('deep-link', { action, params });
    }
  }

  getRegisteredProtocols(): string[] {
    return Array.from(this.handlers.keys());
  }
}

const SUPPORTED_ACTIONS = [
  'open', 'new-project', 'clone', 'settings', 'install-extension',
];

export function isSupportedAction(url: string): boolean {
  try {
    const action = url.replace('ideia://', '').split('?')[0];
    return SUPPORTED_ACTIONS.includes(action);
  } catch {
    return false;
  }
}

export function parseDeepLink(url: string): { action: string; params: Record<string, string> } | null {
  try {
    const cleanUrl = url.replace('ideia://', '');
    const [action, queryString] = cleanUrl.split('?');
    const params = Object.fromEntries(new URLSearchParams(queryString || ''));
    return { action, params };
  } catch {
    return null;
  }
}
