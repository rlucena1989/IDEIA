import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import { ConfigManager } from '@ideia/config-engine';
import * as fs from 'fs';
import * as path from 'path';
const config = ConfigManager.getInstance();
const logger = createLogger('code-sign-pipeline');


export type Platform = 'win32' | 'darwin' | 'linux';
export type ArtifactType = 'exe' | 'msi' | 'app' | 'dmg' | 'AppImage' | 'deb' | 'snap' | 'rpm';

export interface SignConfig {
  platform: Platform;
  artifacts: string[];
  timestampServer: string;
  keyVaultUrl?: string;
  certificateName?: string;
  appleTeamId?: string;
  appleId?: string;
  gpgKeyId?: string;
  signStep?: boolean;
  notarizeStep?: boolean;
  stapleStep?: boolean;
  verifyStep?: boolean;
  cosignStep?: boolean;
}

export interface SignResult {
  artifact: string;
  type: ArtifactType;
  success: boolean;
  error?: string;
  timestamp?: string;
  size: number;
  sha256?: string;
}

export class CodeSignPipeline {
  private config: SignConfig;

  constructor(config: SignConfig) {
    this.config = { signStep: true, notarizeStep: true, stapleStep: true, verifyStep: true, cosignStep: true, ...config };
  }

  async run(): Promise<SignResult[]> {
    const results: SignResult[] = [];
    for (const artifact of this.config.artifacts) {
      try {
        const result = await this.process(artifact);
        results.push(result);
      } catch (err) {
        results.push({
          artifact,
          type: this.detectType(artifact),
          success: false,
          error: err instanceof Error ? err.message : String(err),
          size: fs.statSync(artifact).size,
        });
      }
    }
    return results;
  }

  private detectType(artifact: string): ArtifactType {
    const ext = path.extname(artifact).toLowerCase();
    if (ext === '.exe') return 'exe';
    if (ext === '.msi') return 'msi';
    if (ext === '.app') return 'app';
    if (ext === '.dmg') return 'dmg';
    if (artifact.endsWith('.AppImage')) return 'AppImage';
    if (ext === '.deb') return 'deb';
    if (ext === '.snap') return 'snap';
    if (ext === '.rpm') return 'rpm';
    return 'exe';
  }

  private async process(artifact: string): Promise<SignResult> {
    const type = this.detectType(artifact);
    switch (this.config.platform) {
      case 'win32': return this.processWindows(artifact, type);
      case 'darwin': return this.processMacOS(artifact, type);
      case 'linux': return this.processLinux(artifact, type);
      default: throw new Error(`Unsupported platform: ${this.config.platform}`);
    }
  }

  private async processWindows(artifact: string, type: ArtifactType): Promise<SignResult> {
    if (this.config.signStep) {
      if (this.config.keyVaultUrl) {
        execSync(
          `AzureSignTool sign -kvu ${this.config.keyVaultUrl}` +
          ` -kvi ${config.get('AZURE_CLIENT_ID')}` +
          ` -kvs ${config.get('AZURE_CLIENT_SECRET')}` +
          ` -kvc ${this.config.certificateName || 'ideia-code-signing'}` +
          ` -tr ${this.config.timestampServer} -td SHA256 -v "${artifact}"`,
          { timeout: 180000 }
        );
      } else if (config.get('CERT_PFX_PATH')) {
        execSync(
          `signtool sign /fd SHA256 /a /f "${config.get('CERT_PFX_PATH')}"` +
          ` /p ${config.get('CERT_PASSWORD')}` +
          ` /tr ${this.config.timestampServer} /td SHA256 "${artifact}"`,
          { timeout: 180000 }
        );
      } else {
        throw new Error('No signing method configured');
      }
    }
    if (this.config.cosignStep && config.get('COSIGN_KEY_PATH')) {
      execSync(`cosign sign-blob --key ${config.get('COSIGN_KEY_PATH')} "${artifact}" > "${artifact}.sig"`, { timeout: 60000 });
    }
    return {
      artifact, type, success: true,
      timestamp: new Date().toISOString(),
      size: fs.statSync(artifact).size,
    };
  }

  private async processMacOS(artifact: string, type: ArtifactType): Promise<SignResult> {
    const teamId = this.config.appleTeamId || config.get('APPLE_TEAM_ID') || '';
    const identity = `Developer ID Application: IDEIA Inc (${teamId})`;
    if (this.config.signStep) {
      execSync(
        `codesign --force --options runtime --sign "${identity}" --deep --timestamp "${artifact}"`,
        { timeout: 180000 }
      );
    }
    return {
      artifact, type, success: true,
      timestamp: new Date().toISOString(),
      size: fs.statSync(artifact).size,
    };
  }

  private async processLinux(artifact: string, type: ArtifactType): Promise<SignResult> {
    const keyId = this.config.gpgKeyId || config.get('GPG_KEY_ID') || '';
    if (this.config.signStep) {
      switch (type) {
        case 'AppImage':
          execSync(`gpg --detach-sign --armor --default-key ${keyId} "${artifact}"`, { timeout: 60000 });
          break;
        case 'deb':
          execSync(`debsign --re-sign -k${keyId} "${artifact}"`, { timeout: 60000 });
          break;
        case 'snap':
          execSync(`snap sign "${artifact}" > "${artifact}.asc"`, { timeout: 60000 });
          break;
        case 'rpm':
          execSync(`rpmsign --addsign "${artifact}"`, { timeout: 60000 });
          break;
      }
    }
    return {
      artifact, type, success: true,
      timestamp: new Date().toISOString(),
      size: fs.statSync(artifact).size,
    };
  }
}
