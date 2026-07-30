import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
const logger = createLogger('dmg-builder');

export interface DmgOptions {
  appPath: string;
  outputDir: string;
  appName: string;
  version: string;
  background?: string;
  iconSize?: number;
  windowWidth?: number;
  windowHeight?: number;
}

export class DmgBuilder {
  async build(opts: DmgOptions): Promise<string> {
    const outputName = `${opts.appName}-${opts.version}.dmg`;
    const outputPath = join(opts.outputDir, outputName);

    if (!existsSync(opts.outputDir)) mkdirSync(opts.outputDir, { recursive: true });

    const staging = join('dist', 'dmg-staging');
    if (!existsSync(staging)) mkdirSync(staging, { recursive: true });
    execSync(`cp -R "${opts.appPath}" "${staging}/"`, { stdio: 'inherit' });
    execSync(`ln -s /Applications "${staging}/Applications"`, { stdio: 'inherit' });

    const _windowWidth = opts.windowWidth || 600;
    const _windowHeight = opts.windowHeight || 400;

    execSync(
      `hdiutil create -volname "${opts.appName} ${opts.version}" -srcfolder "${staging}" -ov -format UDZO -fs HFS+ "${outputPath}"`,
      { stdio: 'inherit' },
    );

    return outputPath;
  }
}
