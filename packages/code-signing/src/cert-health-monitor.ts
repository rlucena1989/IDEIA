import { KeyManager } from './key-manager';
import { createLogger } from '@ideia/logger';
import * as https from 'https';
const logger = createLogger('cert-health-monitor');

export class CertHealthMonitor {
  private keyManager: KeyManager;
  private alertWebhook: string;

  constructor(keyManager: KeyManager, alertWebhook: string) {
    this.keyManager = keyManager;
    this.alertWebhook = alertWebhook;
  }

  async check(): Promise<void> {
    const expiring = this.keyManager.getExpiringKeys(30);
    const expired = this.keyManager.getExpiredKeys();
    if (expiring.length > 0 || expired.length > 0) {
      await this.sendAlert({
        level: expired.length > 0 ? 'CRITICAL' : 'WARNING',
        expiring: expiring.map(k => ({ name: k.name, expiresAt: k.expiresAt })),
        expired: expired.map(k => ({ name: k.name, expiresAt: k.expiresAt })),
      });
    }
  }

  private async sendAlert(payload: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const url = new URL(this.alertWebhook);
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, _res => resolve());
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}
