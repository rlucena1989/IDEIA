import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('silent-install-runner');

export type Platform = 'win32' | 'darwin' | 'linux';

export interface InstallOptions {
  packagePath: string;
  installDir?: string;
  configFile?: string;
  noTelemetry?: boolean;
  uninstall?: boolean;
  proxy?: string;
  timeout?: number;
}

export interface InstallResult {
  success: boolean;
  platform: Platform;
  packageType: string;
  installDir: string;
  logPath: string;
  error?: string;
  exitCode?: number;
}

export class SilentInstallRunner {
  private platform: Platform;
  private logDir: string;

  constructor(platform?: Platform, logDir?: string) {
    this.platform = platform || (process.platform as Platform);
    this.logDir = logDir || '/tmp/ideia-install';
  }

  async run(options: InstallOptions): Promise<InstallResult> {
    const pkgExt = path.extname(options.packagePath).toLowerCase();
    const baseResult = {
      platform: this.platform,
      packageType: pkgExt,
      installDir: options.installDir || this.defaultInstallDir(),
      logPath: path.join(this.logDir, `install-${Date.now()}.log`),
      success: false,
    };

    try {
      switch (this.platform) {
        case 'win32': {
          const r = await this.installWindows(options, pkgExt);
          return { ...baseResult, ...r, success: r.success ?? false };
        }
        case 'darwin': {
          const r = await this.installMacOS(options, pkgExt);
          return { ...baseResult, ...r, success: r.success ?? false };
        }
        case 'linux': {
          const r = await this.installLinux(options, pkgExt);
          return { ...baseResult, ...r, success: r.success ?? false };
        }
        default:
          return { ...baseResult, success: false, error: `Unsupported platform: ${this.platform}` };
      }
    } catch (err) {
      return { ...baseResult, success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async installWindows(options: InstallOptions, ext: string): Promise<Partial<InstallResult>> {
    const targetDir = options.installDir || process.env.ProgramFiles + '\\IDEIA';
    switch (ext) {
      case '.msi': {
        const props = `INSTALLDIR="${targetDir}"${options.noTelemetry ? ' DISABLE_TELEMETRY=1' : ''}${options.proxy ? ` PROXY_SERVER=${options.proxy}` : ''}`;
        execSync(`msiexec /i "${options.packagePath}" /qn /norestart ${props}`, { timeout: options.timeout || 300000 });
        return { success: true, exitCode: 0 };
      }
      case '.exe':
        execSync(`"${options.packagePath}" /S /D="${targetDir}"`, { timeout: options.timeout || 300000 });
        return { success: true, exitCode: 0 };
      default:
        return { success: false, error: `Unsupported Windows package: ${ext}` };
    }
  }

  private async installMacOS(options: InstallOptions, ext: string): Promise<Partial<InstallResult>> {
    switch (ext) {
      case '.pkg':
        execSync(`installer -pkg "${options.packagePath}" -target /`, { timeout: options.timeout || 300000 });
        return { success: true, exitCode: 0 };
      case '.dmg': {
        const mountPoint = execSync(`hdiutil attach "${options.packagePath}" -nobrowse -mountrandom /tmp`).toString().trim().split('\n').pop()?.trim() || '';
        if (mountPoint) {
          execSync(`cp -R "${mountPoint}/IDEIA.app" /Applications/`);
          execSync(`hdiutil detach "${mountPoint}" -quiet`);
        }
        return { success: true, exitCode: 0 };
      }
      default:
        return { success: false, error: `Unsupported macOS package: ${ext}` };
    }
  }

  private async installLinux(options: InstallOptions, ext: string): Promise<Partial<InstallResult>> {
    switch (ext) {
      case '.deb':
        execSync(`DEBIAN_FRONTEND=noninteractive apt-get install -y "${options.packagePath}"`, { timeout: options.timeout || 300000 });
        return { success: true, exitCode: 0 };
      case '.rpm':
        execSync(`dnf install -y "${options.packagePath}"`, { timeout: options.timeout || 300000 });
        return { success: true, exitCode: 0 };
      case '.appimage': {
        const targetDir = options.installDir || '/opt/ideia';
        execSync(`mkdir -p ${targetDir} && chmod +x "${options.packagePath}" && cp "${options.packagePath}" ${targetDir}/ideia.AppImage`);
        return { success: true, exitCode: 0 };
      }
      default:
        return { success: false, error: `Unsupported Linux package: ${ext}` };
    }
  }

  private defaultInstallDir(): string {
    switch (this.platform) {
      case 'win32': return 'C:\\Program Files\\IDEIA';
      case 'darwin': return '/Applications/IDEIA.app';
      case 'linux': return '/opt/ideia';
      default: return '/opt/ideia';
    }
  }
}
