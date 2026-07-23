export enum NotificationSeverity {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical',
}

export enum NotificationLevel {
  All = 'all',
  Important = 'important',
  Critical = 'critical',
}

export enum ChannelType {
  Toast = 'toast',
  Banner = 'banner',
  Badge = 'badge',
  Desktop = 'desktop',
  Webhook = 'webhook',
  Cli = 'cli',
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  level: NotificationLevel;
  timestamp: Date;
  source?: string;
  action?: NotificationAction;
  metadata?: Record<string, unknown>;
}

export interface NotificationAction {
  label: string;
  handler: string;
  payload?: Record<string, unknown>;
}

export interface ToastConfig {
  autoDismissMs: number;
  showIcon: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible: number;
}

export interface BannerConfig {
  persistent: boolean;
  dismissible: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface BadgeConfig {
  showCount: boolean;
  maxCount: number;
  color: string;
}

export interface DesktopConfig {
  icon?: string;
  silent: boolean;
  tag: string;
  requireInteraction: boolean;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  timeoutMs: number;
  retries: number;
}

export interface CliConfig {
  useColors: boolean;
  prefix: string;
  showTimestamp: boolean;
}

export type ChannelConfig = ToastConfig | BannerConfig | BadgeConfig | DesktopConfig | WebhookConfig | CliConfig;

export interface ChannelConfigMap {
  [ChannelType.Toast]: ToastConfig;
  [ChannelType.Banner]: BannerConfig;
  [ChannelType.Badge]: BadgeConfig;
  [ChannelType.Desktop]: DesktopConfig;
  [ChannelType.Webhook]: WebhookConfig;
  [ChannelType.Cli]: CliConfig;
}

export interface NotificationChannel {
  readonly type: ChannelType;
  send(notification: Notification): Promise<boolean>;
  configure(config: ChannelConfig): void;
  isAvailable(): boolean;
}

export const DEFAULT_TOAST_CONFIG: ToastConfig = {
  autoDismissMs: 3000,
  showIcon: true,
  position: 'top-right',
  maxVisible: 5,
};

export const DEFAULT_BANNER_CONFIG: BannerConfig = {
  persistent: true,
  dismissible: true,
  priority: 'normal',
};

export const DEFAULT_BADGE_CONFIG: BadgeConfig = {
  showCount: true,
  maxCount: 99,
  color: '#ff4444',
};

export const DEFAULT_DESKTOP_CONFIG: DesktopConfig = {
  silent: false,
  tag: 'ideia-notification',
  requireInteraction: false,
};

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  url: '',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  timeoutMs: 5000,
  retries: 3,
};

export const DEFAULT_CLI_CONFIG: CliConfig = {
  useColors: true,
  prefix: '[IDEIA]',
  showTimestamp: true,
};

export const SEVERITY_DURATION: Record<NotificationSeverity, number> = {
  [NotificationSeverity.Success]: 3000,
  [NotificationSeverity.Info]: 4000,
  [NotificationSeverity.Warning]: 5000,
  [NotificationSeverity.Error]: 0,
  [NotificationSeverity.Critical]: 0,
};

export const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  [NotificationSeverity.Success]: '\x1b[32m',
  [NotificationSeverity.Info]: '\x1b[36m',
  [NotificationSeverity.Warning]: '\x1b[33m',
  [NotificationSeverity.Error]: '\x1b[31m',
  [NotificationSeverity.Critical]: '\x1b[41m\x1b[37m',
};
