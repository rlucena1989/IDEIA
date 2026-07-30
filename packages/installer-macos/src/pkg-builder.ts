import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
const logger = createLogger('pkg-builder');

export interface PkgOptions {
  appPath: string;
  outputDir: string;
  appName: string;
  version: string;
  identifier: string;
  minOsVersion: string;
  signingIdentity?: string;
  scriptsDir?: string;
}

export class PkgBuilder {
  async build(opts: PkgOptions): Promise<string> {
    const buildDir = join(opts.outputDir, 'pkg-build');
    const componentDir = join(buildDir, 'component');
    const scriptsDir = opts.scriptsDir || join(buildDir, 'scripts');

    if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });
    if (!existsSync(join(componentDir, 'Applications'))) mkdirSync(join(componentDir, 'Applications'), { recursive: true });
    if (!existsSync(scriptsDir)) mkdirSync(scriptsDir, { recursive: true });

    execSync(`cp -R "${opts.appPath}" "${join(componentDir, 'Applications')}/"`, { stdio: 'inherit' });

    const componentPkg = join(buildDir, `${opts.appName}-component.pkg`);
    execSync(`pkgbuild --root "${componentDir}" --identifier "${opts.identifier}" --version "${opts.version}" --install-location "/" "${componentPkg}"`, { timeout: 120000 });

    const outputPath = join(opts.outputDir, `${opts.appName}-${opts.version}.pkg`);
    const signArg = opts.signingIdentity ? `--sign "${opts.signingIdentity}"` : '';
    execSync(`productbuild --package-path "${buildDir}" ${signArg} "${outputPath}"`, { timeout: 120000 });

    return outputPath;
  }
}
