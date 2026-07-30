import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
const logger = createLogger('universal-binary-builder');

export class UniversalBinaryBuilder {
  createUniversal(arm64Binary: string, x64Binary: string, outputPath: string): boolean {
    try {
      execSync(`lipo -create "${arm64Binary}" "${x64Binary}" -output "${outputPath}"`, { timeout: 60000 });
      return true;
    } catch {
      return false;
    }
  }

  verifyArchitectures(binaryPath: string): string[] {
    try {
      const output = execSync(`lipo -info "${binaryPath}"`).toString();
      const match = output.match(/architectures:\s*(.+)/);
      return match?.[1]?.split(',').map(a => a.trim()) || [];
    } catch {
      return [];
    }
  }
}
