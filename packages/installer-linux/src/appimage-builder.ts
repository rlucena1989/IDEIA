import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const logger = createLogger('appimage-builder');

export class AppImageBuilder {
  async build(appDir: string, outputPath: string, appName: string): Promise<string> {
    if (!existsSync(appDir)) throw new Error(`AppDir not found: ${appDir}`);
    const outputDir = join(outputPath, '..');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const appRunPath = join(appDir, 'AppRun');
    if (!existsSync(appRunPath)) {
      writeFileSync(appRunPath, `#!/bin/bash
SELF=$(readlink -f "$0")
HERE=\${SELF%/*}
export PATH="\${HERE}/usr/bin/:\${PATH}"
export LD_LIBRARY_PATH="\${HERE}/usr/lib/:\${LD_LIBRARY_PATH}"
exec "\${HERE}/usr/bin/${appName}" "$@"`, { mode: 0o755 });
    }

    const desktopPath = join(appDir, `${appName}.desktop`);
    if (!existsSync(desktopPath)) {
      writeFileSync(desktopPath, `[Desktop Entry]\nName=${appName}\nExec=${appName}\nIcon=${appName}\nType=Application\nCategories=Development;IDE;\n`);
    }

    execSync(`mksquashfs "${appDir}" "${outputPath}.squashfs" -root-owned -noappend`, { timeout: 120000 });
    execSync(`cat /usr/lib/AppImageRuntime ${outputPath}.squashfs > "${outputPath}"`, { timeout: 60000 });
    execSync(`chmod +x "${outputPath}"`, {});

    return outputPath;
  }
}
