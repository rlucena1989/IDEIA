import { execFileSync } from 'child_process';

export interface CodeSignConfig {
  enabled: boolean;
  certificatePath?: string;
  certificatePassword?: string;
  timestampServer?: string;
  signToolPath?: string;
}

export function signWindows(binaryPath: string, config: CodeSignConfig): boolean {
  if (!config.enabled) return false;
  try {
    const signTool = config.signToolPath || 'signtool.exe';
    const args = ['sign', '/fd', 'SHA256'];
    if (config.certificatePath) {
      args.push('/f', config.certificatePath);
    }
    if (config.certificatePassword) {
      args.push('/p', config.certificatePassword);
    }
    if (config.timestampServer) {
      args.push('/tr', config.timestampServer, '/td', 'SHA256');
    }
    args.push(binaryPath);
    execFileSync(signTool, args, { timeout: 60000 });
    return true;
  } catch {
    return false;
  }
}

export function signMac(dmgPath: string, config: CodeSignConfig): boolean {
  if (!config.enabled) return false;
  try {
    execFileSync('codesign', ['--force', '--sign', '-', dmgPath], { timeout: 60000 });
    return true;
  } catch {
    return false;
  }
}
