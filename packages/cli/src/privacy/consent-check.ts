import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '@ideia/logger';

const logger = createLogger('privacy:consent-check');

export interface ConsentState {
  consented: boolean;
  consentedAt: string;
  telemetry: boolean;
  version: string;
}

const CONSENT_FILE = '.ai/privacy-consent.json';

function getConsentPath(root: string): string {
  return path.join(root, CONSENT_FILE);
}

export function loadConsent(root: string): ConsentState | null {
  const consentPath = getConsentPath(root);
  if (!fs.existsSync(consentPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(consentPath, 'utf8')) as ConsentState;
  } catch {
    return null;
  }
}

export function saveConsent(root: string, state: ConsentState): void {
  const consentPath = getConsentPath(root);
  fs.mkdirSync(path.dirname(consentPath), { recursive: true });
  fs.writeFileSync(consentPath, JSON.stringify(state, null, 2));
  logger.info('Privacy consent saved', { path: consentPath });
}

export function checkConsent(root: string): ConsentState {
  const existing = loadConsent(root);
  if (existing) return existing;

  const state: ConsentState = {
    consented: true,
    consentedAt: new Date().toISOString(),
    telemetry: false,
    version: '1.0',
  };

  saveConsent(root, state);
  logger.info('Privacy consent auto-granted on first run');
  return state;
}
