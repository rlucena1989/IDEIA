import { Notification, BrowserWindow } from 'electron';

export interface DesktopNotification {
  title: string;
  body: string;
  icon?: string;
  urgency?: 'normal' | 'critical' | 'low';
  actions?: Array<{ text: string; callback: () => void }>;
}

export class DesktopNotifier {
  private mainWindow?: BrowserWindow;
  private history: DesktopNotification[] = [];

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  send(notification: DesktopNotification): void {
    this.history.push(notification);

    try {
      const n = new Notification({
        title: notification.title,
        body: notification.body,
        urgency: notification.urgency || 'normal',
        icon: notification.icon,
      });

      n.on('click', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });

      n.show();
    } catch (err) {
      console.error('[notifier] Failed to show notification:', err);
    }

    if (this.mainWindow) {
      this.mainWindow.webContents.send('desktop-notification', {
        title: notification.title,
        body: notification.body,
      });
    }
  }

  sendDeployStarted(version: string, environment: string): void {
    this.send({
      title: '🚀 Deploy iniciado',
      body: `Deploy v${version} para ${environment}`,
      urgency: 'normal',
    });
  }

  sendDeployCompleted(version: string, environment: string): void {
    this.send({
      title: '✅ Deploy concluído',
      body: `Deploy v${version} para ${environment} concluído com sucesso`,
      urgency: 'normal',
    });
  }

  sendDeployFailed(version: string, environment: string, error?: string): void {
    this.send({
      title: '❌ Deploy falhou',
      body: `Deploy v${version} para ${environment}${error ? `: ${error}` : ''}`,
      urgency: 'critical',
    });
  }

  sendReviewRequired(version: string, environment: string): void {
    this.send({
      title: '👀 Revisão necessária',
      body: `Deploy v${version} para ${environment} aguarda sua revisão`,
      urgency: 'normal',
    });
  }

  getHistory(): DesktopNotification[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}
