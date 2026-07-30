import path from 'node:path';
import fs from 'node:fs';
import { createLogger } from '@ideia/logger';

const log = createLogger('plugin-isolation');

export type IsolationLevel = 'low' | 'medium' | 'high';

export interface PluginIsolationConfig {
  level: IsolationLevel;
  allowedPaths: string[];
  allowedUrls: string[];
  allowedCommands: string[];
  maxCpuPercent: number;
  maxMemoryMb: number;
  maxFileSizeMb: number;
  maxOpenFiles: number;
  timeoutMs: number;
  auditEnabled: boolean;
  allowNetwork: boolean;
  allowProcessSpawn: boolean;
  allowFileWrite: boolean;
  allowFileRead: boolean;
}

export interface PluginIsolationResult {
  allowed: boolean;
  action: 'file-read' | 'file-write' | 'network' | 'process-spawn' | 'resource-check';
  resource: string;
  reason?: string;
  timestamp: string;
  auditEntry?: AuditEntry;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  pluginId: string;
  action: string;
  resource: string;
  allowed: boolean;
  reason?: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  source: string;
}

const DEFAULT_LOW_CONFIG: PluginIsolationConfig = {
  level: 'low',
  allowedPaths: [process.cwd()],
  allowedUrls: ['*'],
  allowedCommands: ['*'],
  maxCpuPercent: 80,
  maxMemoryMb: 512,
  maxFileSizeMb: 100,
  maxOpenFiles: 100,
  timeoutMs: 30000,
  auditEnabled: true,
  allowNetwork: true,
  allowProcessSpawn: true,
  allowFileWrite: true,
  allowFileRead: true,
};

const DEFAULT_MEDIUM_CONFIG: PluginIsolationConfig = {
  level: 'medium',
  allowedPaths: [process.cwd(), path.join(process.cwd(), '.ai')],
  allowedUrls: ['https://*.npmjs.org', 'https://registry.npmjs.org/*', 'https://api.github.com/*'],
  allowedCommands: ['node', 'npm', 'npx', 'git'],
  maxCpuPercent: 50,
  maxMemoryMb: 256,
  maxFileSizeMb: 50,
  maxOpenFiles: 50,
  timeoutMs: 15000,
  auditEnabled: true,
  allowNetwork: true,
  allowProcessSpawn: true,
  allowFileWrite: true,
  allowFileRead: true,
};

const DEFAULT_HIGH_CONFIG: PluginIsolationConfig = {
  level: 'high',
  allowedPaths: [path.join(process.cwd(), '.ai', 'plugins')],
  allowedUrls: [],
  allowedCommands: [],
  maxCpuPercent: 25,
  maxMemoryMb: 128,
  maxFileSizeMb: 10,
  maxOpenFiles: 20,
  timeoutMs: 10000,
  auditEnabled: true,
  allowNetwork: false,
  allowProcessSpawn: false,
  allowFileWrite: false,
  allowFileRead: true,
};

const DEFAULT_CONFIGS: Record<IsolationLevel, PluginIsolationConfig> = {
  low: DEFAULT_LOW_CONFIG,
  medium: DEFAULT_MEDIUM_CONFIG,
  high: DEFAULT_HIGH_CONFIG,
};

export class PluginIsolation {
  private config: PluginIsolationConfig;
  private auditLog: AuditEntry[] = [];
  private plugin: PluginInfo;
  private auditStream: fs.WriteStream | null = null;

  constructor(plugin: PluginInfo, config?: Partial<PluginIsolationConfig>) {
    this.plugin = plugin;
    const baseConfig = DEFAULT_CONFIGS[config?.level || 'medium'];
    this.config = { ...baseConfig, ...config };

    if (this.config.auditEnabled) {
      this.initAuditStream();
    }

    log.info(`Plugin isolation initialized for ${plugin.id} at level ${this.config.level}`);
  }

  checkFileRead(filePath: string): PluginIsolationResult {
    const timestamp = new Date().toISOString();
    const resolvedPath = path.resolve(filePath);

    if (!this.config.allowFileRead) {
      return this.deny('file-read', filePath, 'File read operations are disabled at current isolation level');
    }

    const allowed = this.isPathAllowed(resolvedPath);
    const result = this.buildResult(allowed, 'file-read', filePath, timestamp,
      allowed ? undefined : `Path not in allowlist: ${resolvedPath}`);

    this.audit(result);
    return result;
  }

  checkFileWrite(filePath: string): PluginIsolationResult {
    const timestamp = new Date().toISOString();
    const resolvedPath = path.resolve(filePath);

    if (!this.config.allowFileWrite) {
      return this.deny('file-write', filePath, 'File write operations are disabled at current isolation level');
    }

    const fileSize = this.getFileSizeIfExists(resolvedPath);
    if (fileSize !== null && fileSize > this.config.maxFileSizeMb * 1024 * 1024) {
      return this.deny('file-write', filePath, `File exceeds max size of ${this.config.maxFileSizeMb}MB`);
    }

    const allowed = this.isPathAllowed(resolvedPath);
    const result = this.buildResult(allowed, 'file-write', filePath, timestamp,
      allowed ? undefined : `Path not in allowlist: ${resolvedPath}`);

    this.audit(result);
    return result;
  }

  checkNetwork(url: string): PluginIsolationResult {
    const timestamp = new Date().toISOString();

    if (!this.config.allowNetwork) {
      return this.deny('network', url, 'Network access is disabled at current isolation level');
    }

    if (!this.isUrlAllowed(url)) {
      return this.deny('network', url, `URL not in allowlist: ${url}`);
    }

    const result = this.buildResult(true, 'network', url, timestamp);
    this.audit(result);
    return result;
  }

  checkProcessSpawn(command: string): PluginIsolationResult {
    const timestamp = new Date().toISOString();

    if (!this.config.allowProcessSpawn) {
      return this.deny('process-spawn', command, 'Process spawning is disabled at current isolation level');
    }

    const cmdName = command.split(/\s+/)[0];
    if (!this.isCommandAllowed(cmdName)) {
      return this.deny('process-spawn', command, `Command not in allowlist: ${cmdName}`);
    }

    const result = this.buildResult(true, 'process-spawn', command, timestamp);
    this.audit(result);
    return result;
  }

  checkResourceLimits(): { withinLimits: boolean; currentMemoryMb: number; reason?: string } {
    try {
      const memUsage = process.memoryUsage();
      const currentMemoryMb = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;

      if (currentMemoryMb > this.config.maxMemoryMb) {
        return {
          withinLimits: false,
          currentMemoryMb,
          reason: `Memory usage ${currentMemoryMb}MB exceeds limit of ${this.config.maxMemoryMb}MB`,
        };
      }

      return { withinLimits: true, currentMemoryMb };
    } catch (_err) {
      return { withinLimits: true, currentMemoryMb: 0 };
    }
  }

  updateConfig(config: Partial<PluginIsolationConfig>): void {
    this.config = { ...this.config, ...config };
    log.info(`Plugin isolation config updated for ${this.plugin.id}: ${JSON.stringify(config)}`);
  }

  getConfig(): PluginIsolationConfig {
    return { ...this.config };
  }

  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  getPlugin(): PluginInfo {
    return { ...this.plugin };
  }

  private isPathAllowed(resolvedPath: string): boolean {
    for (const allowed of this.config.allowedPaths) {
      const resolvedAllowed = path.resolve(allowed);
      if (resolvedPath.startsWith(resolvedAllowed + path.sep) || resolvedPath === resolvedAllowed) {
        return true;
      }
    }
    return false;
  }

  private isUrlAllowed(url: string): boolean {
    if (this.config.allowedUrls.includes('*')) return true;
    for (const allowed of this.config.allowedUrls) {
      const escaped = allowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(`^${escaped}$`, 'i');
      if (regex.test(url)) return true;
    }
    return false;
  }

  private isCommandAllowed(command: string): boolean {
    if (this.config.allowedCommands.includes('*')) return true;
    return this.config.allowedCommands.includes(command);
  }

  private getFileSizeIfExists(filePath: string): number | null {
    try {
      const stat = fs.statSync(filePath, { throwIfNoEntry: false });
      return stat?.size ?? null;
    } catch {
      return null;
    }
  }

  private buildResult(
    allowed: boolean,
    action: PluginIsolationResult['action'],
    resource: string,
    timestamp: string,
    reason?: string,
  ): PluginIsolationResult {
    return { allowed, action, resource, reason, timestamp };
  }

  private deny(
    action: PluginIsolationResult['action'],
    resource: string,
    reason: string,
  ): PluginIsolationResult {
    return {
      allowed: false,
      action,
      resource,
      reason,
      timestamp: new Date().toISOString(),
    };
  }

  private audit(result: PluginIsolationResult): void {
    if (!this.config.auditEnabled) return;

    const entry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: result.timestamp,
      pluginId: this.plugin.id,
      action: result.action,
      resource: result.resource,
      allowed: result.allowed,
      reason: result.reason,
    };

    this.auditLog.push(entry);

    if (this.auditStream) {
      try {
        this.auditStream.write(JSON.stringify(entry) + '\n');
      } catch (_err) {
        log.error(`Failed to write audit entry for plugin ${this.plugin.id}`);
      }
    }
  }

  private initAuditStream(): void {
    try {
      const auditDir = path.join(process.cwd(), '.ai', 'audit', 'plugins');
      fs.mkdirSync(auditDir, { recursive: true });
      const logFile = path.join(auditDir, `${this.plugin.id}-${Date.now()}.jsonl`);
      this.auditStream = fs.createWriteStream(logFile, { flags: 'a' });
      log.info(`Plugin isolation audit log: ${logFile}`);
    } catch (_err) {
      log.warn(`Could not initialize audit stream for plugin ${this.plugin.id}`);
    }
  }
}

export function createPluginIsolation(
  plugin: PluginInfo,
  config?: Partial<PluginIsolationConfig>,
): PluginIsolation {
  return new PluginIsolation(plugin, config);
}
