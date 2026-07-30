import * as fs from 'fs/promises';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import * as os from 'os';
const logger = createLogger('enterprise-config');

export interface EnterpriseConfig {
  updates: {
    enabled: boolean;
    channel: 'stable' | 'beta' | 'insider';
    interval: number;
    autoDownload: boolean;
    autoInstall: boolean;
    requireRestart: boolean;
  };
  security: {
    allowedCommands: string[];
    blockedCommands: string[];
    allowedExtensions: string[];
    maxFileSize: number;
    sandboxMode: 'strict' | 'standard' | 'permissive';
    auditEnabled: boolean;
    auditRetentionDays: number;
    allowedHosts: string[];
    tlsMinimumVersion: '1.2' | '1.3';
    certificatePinning: boolean;
    mdmEnforcement: boolean;
  };
  telemetry: {
    enabled: boolean;
    level: 'minimal' | 'operational' | 'full';
    endpoint?: string;
    optOut: boolean;
    anonymizeIP: boolean;
  };
  network: {
    proxy?: { http: string; https: string; noProxy: string[] };
    allowedHosts: string[];
    blockedHosts: string[];
    timeout: number;
    retryCount: number;
    airGapped: boolean;
    mirrorUrls: { npm?: string; pip?: string; docker?: string };
  };
  agents: {
    maxConcurrent: number;
    allowedModels: string[];
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    maxTokens: number;
    temperature: number;
    enableToolUse: boolean;
    enableCodeExecution: boolean;
  };
  compliance: {
    soc2: boolean;
    iso27001: boolean;
    gdpr: boolean;
    hipaa: boolean;
    auditLogPath: string;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    dataRetentionDays: number;
  };
}

export class EnterpriseConfigLoader {
  private cache: EnterpriseConfig | null = null;

  async load(): Promise<EnterpriseConfig> {
    if (this.cache) return this.cache;
    const paths = this.getConfigPaths();
    for (const configPath of paths) {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content) as EnterpriseConfig;
        this.cache = config;
        return config;
      } catch {
        continue;
      }
    }
    return this.defaultConfig();
  }

  private getConfigPaths(): string[] {
    const platform = os.platform();
    if (platform === 'win32') {
      return [
        path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'IDEIA', 'config.json'),
        path.join(process.env.APPDATA || 'C:\\Users\\Default\\AppData\\Roaming', 'IDEIA', 'config.json'),
      ];
    } else if (platform === 'darwin') {
      return [
        '/Library/Preferences/dev.ideia.app.plist',
        path.join(os.homedir(), 'Library/Preferences/dev.ideia.app.plist'),
      ];
    } else {
      return [
        '/etc/ideia/config.json',
        path.join(os.homedir(), '.config/ideia/config.json'),
      ];
    }
  }

  invalidateCache(): void {
    this.cache = null;
  }

  private defaultConfig(): EnterpriseConfig {
    return {
      updates: { enabled: true, channel: 'stable', interval: 24, autoDownload: false, autoInstall: false, requireRestart: false },
      security: { allowedCommands: [], blockedCommands: [], allowedExtensions: [], maxFileSize: 10485760, sandboxMode: 'standard', auditEnabled: true, auditRetentionDays: 90, allowedHosts: [], tlsMinimumVersion: '1.2', certificatePinning: false, mdmEnforcement: false },
      telemetry: { enabled: true, level: 'minimal', anonymizeIP: true, optOut: false },
      network: { allowedHosts: [], blockedHosts: [], timeout: 30000, retryCount: 3, airGapped: false, mirrorUrls: {} },
      agents: { maxConcurrent: 2, allowedModels: [], logLevel: 'info', maxTokens: 4096, temperature: 0.7, enableToolUse: true, enableCodeExecution: false },
      compliance: { soc2: false, iso27001: false, gdpr: false, hipaa: false, auditLogPath: '/var/log/ideia/audit.log', encryptionAtRest: true, encryptionInTransit: true, dataRetentionDays: 365 },
    };
  }
}
