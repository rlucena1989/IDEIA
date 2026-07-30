import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
const logger = createLogger('code-sign-manager');

export interface CertificateInfo {
  name: string;
  type: 'Developer ID Application' | 'Developer ID Installer' | 'Mac App Distribution';
  teamId: string;
  expiresAt: string;
}

export class CodeSignManager {
  signApp(appPath: string, identity: string, entitlements?: string): boolean {
    try {
      const entitlementsArg = entitlements ? `--entitlements "${entitlements}"` : '';
      execSync(`codesign --force --options runtime --sign "${identity}" ${entitlementsArg} --deep --timestamp "${appPath}"`, { timeout: 180000 });
      return true;
    } catch {
      return false;
    }
  }

  verifySignature(appPath: string): CertificateInfo | null {
    try {
      const output = execSync(`codesign -dvvv "${appPath}" 2>&1`).toString();
      const name = (output.match(/Authority=\s*(.+)/)?.[1] || '').trim();
      const teamId = (output.match(/TeamIdentifier=\s*(.+)/)?.[1] || '').trim();
      return { name, type: 'Developer ID Application', teamId, expiresAt: '' };
    } catch {
      return null;
    }
  }

  listAvailableIdentities(): CertificateInfo[] {
    try {
      const output = execSync('security find-identity -v -p codesigning 2>&1').toString();
      return output.split('\n')
        .filter(line => line.includes('Developer ID'))
        .map(line => {
          const match = line.match(/"([^"]+)"/);
          return { name: match?.[1] || '', type: 'Developer ID Application', teamId: '', expiresAt: '' };
        });
    } catch {
      return [];
    }
  }
}
