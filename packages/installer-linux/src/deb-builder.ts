import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const logger = createLogger('deb-builder');

export interface DebConfig {
  packageName: string;
  version: string;
  maintainer: string;
  description: string;
  homepage: string;
  arch: string;
  depends: string[];
  appPath: string;
  iconPath: string;
}

export class DebPackageBuilder {
  async build(config: DebConfig, outputDir: string): Promise<string> {
    const buildDir = join(outputDir, `${config.packageName}_${config.version}_${config.arch}`);
    if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });

    const debianDir = join(buildDir, 'DEBIAN');
    mkdirSync(debianDir, { recursive: true });

    writeFileSync(join(debianDir, 'control'), `Package: ${config.packageName}
Version: ${config.version}
Section: devel
Priority: optional
Architecture: ${config.arch}
Maintainer: ${config.maintainer}
Depends: ${config.depends.join(', ')}
Homepage: ${config.homepage}
Description: ${config.description}
`);

    const usrBin = join(buildDir, 'usr', 'bin');
    mkdirSync(usrBin, { recursive: true });
    execSync(`cp "${config.appPath}" "${join(usrBin, config.packageName)}"`, {});

    const outputPath = join(outputDir, `${config.packageName}_${config.version}_${config.arch}.deb`);
    execSync(`dpkg-deb --build "${buildDir}" "${outputPath}"`, { timeout: 120000 });
    return outputPath;
  }
}
