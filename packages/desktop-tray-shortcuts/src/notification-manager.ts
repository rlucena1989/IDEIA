export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  urgency?: 'low' | 'normal' | 'critical';
  actions?: Array<{ label: string; action: string }>;
  onAction?: (action: string) => void;
  onClose?: () => void;
}

export class NotificationManager {
  async show(config: NotificationConfig): Promise<string> {
    const id = `notif-${Date.now()}`;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(config.title, {
        body: config.body,
        icon: config.icon,
      });
    }
    return id;
  }

  async requestPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission;
  }
}
