import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
const logger = createLogger('notarization-pipeline');

export interface NotarizationOptions {
  appPath: string;
  appleId: string;
  teamId: string;
  password: string;
  bundleId: string;
}

export class NotarizationPipeline {
  async notarize(opts: NotarizationOptions): Promise<boolean> {
    try {
      execSync(
        `xcrun notarytool submit "${opts.appPath}" --apple-id "${opts.appleId}" --team-id "${opts.teamId}" --password "${opts.password}" --wait`,
        { stdio: 'inherit', timeout: 600000 },
      );
      execSync(`xcrun stapler staple "${opts.appPath}"`, { stdio: 'inherit', timeout: 60000 });
      return true;
    } catch {
      return false;
    }
  }

  async verifyNotarization(appPath: string): Promise<boolean> {
    try {
      execSync(`spctl -a -v --type exec "${appPath}"`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async staple(appPath: string): Promise<boolean> {
    try {
      execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit', timeout: 60000 });
      return true;
    } catch {
      return false;
    }
  }
}
