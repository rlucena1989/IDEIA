import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('backup-diag');

interface DiagResult {
  backupDirs: string[];
  latestBackup: string | null;
  backupCount: number;
  totalSizeBytes: number;
  issues: string[];
}

async function main() {
  const dirsToCheck = ['.deploy/backups/postgres', '.deploy/backups/vector-store', '.deploy/backups/llm-state', '.deploy/backups/fallback'];
  const result: DiagResult = { backupDirs: [], latestBackup: null, backupCount: 0, totalSizeBytes: 0, issues: [] };

  for (const dir of dirsToCheck) {
    try {
      if (!fs.existsSync(dir)) {
        result.issues.push(`Backup directory not found: ${dir}`);
        continue;
      }
      result.backupDirs.push(dir);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.gz') || f.endsWith('.json'));
      result.backupCount += files.length;
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        result.totalSizeBytes += stat.size;
        if (!result.latestBackup || stat.mtimeMs > fs.statSync(result.latestBackup).mtimeMs) {
          result.latestBackup = filePath;
        }
      }
    } catch (err) {
      result.issues.push(`Error checking ${dir}: ${(err as Error).message}`);
    }
  }

  logger.info('Backup diagnosis complete', result);

  if (result.issues.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
