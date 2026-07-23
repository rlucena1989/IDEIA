# @ideia/notification-system

> Unified Notification System — multi-channel notifications (toast, banner, badge, desktop, webhook, CLI).

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/notification-system
```

## Usage

```typescript
import { NotificationSystem, ToastChannel, NotificationSeverity } from '@ideia/notification-system';

const ns = new NotificationSystem();
ns.registerChannel(new ToastChannel());
ns.notify({ title: 'Build complete', severity: NotificationSeverity.INFO });
```

## API

- `NotificationSystem` — unified notification dispatcher
- Channels: `ToastChannel`, `BannerChannel`, `BadgeChannel`, `DesktopChannel`, `WebhookChannel`, `CliChannel`
- Concepts: `NotificationSeverity`, `NotificationLevel`, `ChannelType`
- Default configs: `DEFAULT_TOAST_CONFIG`, `DEFAULT_BANNER_CONFIG`, `DEFAULT_BADGE_CONFIG`, `DEFAULT_DESKTOP_CONFIG`, `DEFAULT_WEBHOOK_CONFIG`, `DEFAULT_CLI_CONFIG`
- Constants: `SEVERITY_DURATION`, `SEVERITY_COLOR`
- Types: `Notification`, `NotificationAction`, `NotificationChannel`, `ChannelConfig`, `ChannelConfigMap`, `ToastConfig`, `BannerConfig`, `BadgeConfig`, `DesktopConfig`, `WebhookConfig`, `CliConfig`

## License

MIT
