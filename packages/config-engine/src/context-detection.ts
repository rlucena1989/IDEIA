import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import _os from 'os';
import { createLogger } from '@ideia/logger';
import type { ContextType } from './types';
import type { ConfigEngine } from './config-engine';

const log = createLogger('context-detection');

const CONTEXT_FILE = path.join('.ideia', 'context.json');

interface ContextConfig {
  current: ContextType;
  history: Array<{ context: ContextType; timestamp: string; source: string }>;
}

async function readContextConfig(): Promise<ContextConfig> {
  try {
    const content = await fsp.readFile(CONTEXT_FILE, 'utf-8');
    return JSON.parse(content) as ContextConfig;
  } catch {
    return { current: 'development', history: [] };
  }
}

async function writeContextConfig(config: ContextConfig): Promise<void> {
  await fsp.mkdir(path.dirname(CONTEXT_FILE), { recursive: true });
  await fsp.writeFile(CONTEXT_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export class ContextDetector {
  private current: ContextType = 'development';

  constructor(private configEngine: ConfigEngine) {}

  async detect(): Promise<ContextType> {
    const detected = await this.detectFromEnvironment();
    const saved = await readContextConfig();
    if (saved.current !== detected) {
      log.info(`Context mismatch: saved=${saved.current}, detected=${detected}, using detected`);
    }
    this.current = detected;
    await this.persistContext(detected, 'auto-detect');
    return detected;
  }

  private async detectFromEnvironment(): Promise<ContextType> {
    if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.GITLAB_CI === 'true') {
      return 'production';
    }

    try {
      const head = await fsp.readFile(path.join('.git', 'HEAD'), 'utf-8');
      const ref = head.trim();
      if (ref.includes('refs/heads/main') || ref.includes('refs/heads/master')) {
        return 'production';
      }
      if (ref.includes('refs/heads/emergency') || ref.includes('refs/heads/hotfix')) {
        return 'emergency';
      }
      if (ref.includes('refs/heads/feature') || ref.includes('refs/heads/develop')) {
        return 'development';
      }
    } catch {
      log.debug('No git HEAD found, skipping branch detection');
    }

    if (process.env.NODE_ENV === 'production') return 'production';
    if (process.env.NODE_ENV === 'development') return 'development';

    if (process.env.IDEIA_LEARNING === 'true') return 'learning';
    if (process.env.IDEIA_EMERGENCY === 'true') return 'emergency';

    return 'development';
  }

  async switch(context: ContextType): Promise<void> {
    this.current = context;
    await this.persistContext(context, 'manual-switch');
    await this.applyContextConfig(context);
    log.info(`Context switched to: ${context}`);
  }

  private async persistContext(context: ContextType, source: string): Promise<void> {
    const config = await readContextConfig();
    config.current = context;
    config.history.push({ context, timestamp: new Date().toISOString(), source });
    if (config.history.length > 100) config.history = config.history.slice(-100);
    await writeContextConfig(config);
  }

  private async applyContextConfig(context: ContextType): Promise<void> {
    const configMap: Record<ContextType, Record<string, unknown>> = {
      production: {
        'security.logLevel': 'error',
        'security.sandbox.enabled': true,
        'security.audit.enabled': true,
        'performance.cache.ttl': 5000,
      },
      development: {
        'security.logLevel': 'debug',
        'security.sandbox.enabled': true,
        'security.audit.enabled': true,
        'performance.cache.ttl': 1000,
      },
      emergency: {
        'security.logLevel': 'debug',
        'security.sandbox.enabled': false,
        'security.audit.enabled': true,
        'performance.cache.ttl': 0,
      },
      learning: {
        'security.logLevel': 'info',
        'security.sandbox.enabled': true,
        'security.audit.enabled': true,
        'performance.cache.ttl': 30000,
      },
    };

    const overrides = configMap[context] || {};
    for (const [key, value] of Object.entries(overrides)) {
      try {
        await this.configEngine.set(key, value);
      } catch (_err) {
        log.warn(`Failed to apply context config '${key}': ${String(_err)}`);
      }
    }
  }

  getCurrent(): ContextType {
    return this.current;
  }

  getContextHistory(): Array<{ context: ContextType; timestamp: string; source: string }> {
    const config = fs.existsSync(CONTEXT_FILE)
      ? JSON.parse(fs.readFileSync(CONTEXT_FILE, 'utf-8'))
      : { history: [] };
    return config.history || [];
  }
}
