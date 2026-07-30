import { sendWebhookAlert, isAlertConfigured, AlertPayload } from '../alert-webhook';

const originalEnv = { ...process.env };

function mockFetch(ok: boolean): jest.SpyInstance {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok } as Response);
}

describe('alert-webhook', () => {
  const payload: AlertPayload = {
    title: 'Test Alert',
    message: 'This is a test',
    severity: 'warning',
    command: 'test:run',
    timestamp: '2026-07-26T00:00:00.000Z',
  };

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe('isAlertConfigured', () => {
    it('should return true when slack webhook URL is set', () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      expect(isAlertConfigured()).toBe(true);
    });

    it('should return true when discord webhook URL is set', () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/xxx';
      expect(isAlertConfigured()).toBe(true);
    });

    it('should return true when both email config is set', () => {
      process.env.ALERT_EMAIL_TO = 'test@example.com';
      process.env.SMTP_HOST = 'smtp.example.com';
      expect(isAlertConfigured()).toBe(true);
    });

    it('should return false when no webhook is configured', () => {
      delete process.env.SLACK_WEBHOOK_URL;
      delete process.env.DISCORD_WEBHOOK_URL;
      delete process.env.ALERT_EMAIL_TO;
      delete process.env.SMTP_HOST;
      expect(isAlertConfigured()).toBe(false);
    });

    it('should return false when only email to is set without smtp host', () => {
      process.env.ALERT_EMAIL_TO = 'test@example.com';
      delete process.env.SMTP_HOST;
      expect(isAlertConfigured()).toBe(false);
    });
  });

  describe('sendWebhookAlert', () => {
    it('should send to slack when configured', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      const fetchMock = mockFetch(true);

      const result = await sendWebhookAlert(payload);
      expect(result.slack).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://hooks.slack.com/xxx',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should send to discord when configured', async () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/xxx';
      const fetchMock = mockFetch(true);

      const result = await sendWebhookAlert(payload);
      expect(result.discord).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should send to both slack and discord when both configured', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/xxx';
      const fetchMock = mockFetch(true);

      const result = await sendWebhookAlert(payload);
      expect(result.slack).toBe(true);
      expect(result.discord).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should return false for unconfigured channels', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      delete process.env.DISCORD_WEBHOOK_URL;
      delete process.env.ALERT_EMAIL_TO;
      delete process.env.SMTP_HOST;
      const fetchMock = jest.spyOn(globalThis, 'fetch');

      const result = await sendWebhookAlert(payload);
      expect(result.slack).toBe(false);
      expect(result.discord).toBe(false);
      expect(result.email).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle fetch failure gracefully', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      mockFetch(false);

      const result = await sendWebhookAlert(payload);
      expect(result.slack).toBe(false);
    });

    it('should handle fetch throwing an error', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/xxx';
      jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

      const result = await sendWebhookAlert(payload);
      expect(result.slack).toBe(false);
    });

    it('should not send email without smtp configuration', async () => {
      process.env.ALERT_EMAIL_TO = 'test@example.com';
      delete process.env.SMTP_HOST;

      const result = await sendWebhookAlert(payload);
      expect(result.email).toBe(false);
    });
  });
});
