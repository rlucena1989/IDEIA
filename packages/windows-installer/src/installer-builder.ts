import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('installer-builder');

export interface BuildResult {
  success: boolean;
  outputPath: string;
  type: 'msi' | 'nsis' | 'inno';
  size?: number;
  error?: string;
}

export class InstallerBuilder {
  async buildMsi(configPath: string, outputDir: string): Promise<BuildResult> {
    try {
      execSync(`candle "${configPath}" -out "${path.join(outputDir, 'build.wixobj')}"`, { timeout: 60000 });
      execSync(`light "${path.join(outputDir, 'build.wixobj')}" -out "${path.join(outputDir, 'IDEIA.msi')}"`, { timeout: 60000 });
      return { success: true, outputPath: path.join(outputDir, 'IDEIA.msi'), type: 'msi' };
    } catch (err) {
      return { success: false, outputPath: '', type: 'msi', error: err instanceof Error ? err.message : String(err) };
    }
  }

  async buildNsis(scriptPath: string, outputDir: string): Promise<BuildResult> {
    try {
      execSync(`makensis "${scriptPath}"`, { cwd: outputDir, timeout: 120000 });
      return { success: true, outputPath: path.join(outputDir, 'IDEIA-Setup.exe'), type: 'nsis' };
    } catch (err) {
      return { success: false, outputPath: '', type: 'nsis', error: err instanceof Error ? err.message : String(err) };
    }
  }

  async buildInno(scriptPath: string, outputDir: string): Promise<BuildResult> {
    try {
      execSync(`iscc "${scriptPath}"`, { cwd: outputDir, timeout: 120000 });
      return { success: true, outputPath: path.join(outputDir, 'IDEIA-Setup.exe'), type: 'inno' };
    } catch (err) {
      return { success: false, outputPath: '', type: 'inno', error: err instanceof Error ? err.message : String(err) };
    }
  }
}
