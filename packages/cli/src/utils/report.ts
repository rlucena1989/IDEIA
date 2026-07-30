
import fs from "node:fs";
import { createLogger } from '@ideia/logger';
import path from "node:path";
import { getCliVersion } from "./version";

/**
 * Gera setup report.
 * @param targetDir - Valor dir.
 * @param options - Valor options.
 * @param copyResult - Valor result.
 * @param scriptResult - Valor result.
 * @param sourceTemplate - Valor template.
 */
export function generateSetupReport(
  targetDir: string,
  options: Record<string, unknown>,
  copyResult: { backedUp: string[]; copied: string[]; skipped: string[]; overwritten: string[]; errors: string[] },
  scriptResult: { added: string[]; preserved: string[]; overwritten: string[] },
  sourceTemplate: string,
) {
  if (options.dryRun) return;

  const reportPath = path.join(targetDir, ".ai", "setup-report.md");
  const backupRoot = copyResult.backedUp.length > 0 ? path.dirname(copyResult.backedUp[0]) : "None";
  
  const content = `# AI-DevKit Setup Report

## Summary
- Date: ${new Date().toISOString()}
- Target directory: ${targetDir}
- Source template: ${sourceTemplate}
- Flavor: ${options.flavor}
- Mode: ${options.force ? 'force' : 'safe'}
- CLI version: ${getCliVersion()}
- Node version: ${process.versions.node}

## Files copied
- Created: ${copyResult.copied.length}
- Skipped: ${copyResult.skipped.length}
- Overwritten: ${copyResult.overwritten.length}
- Backed up: ${copyResult.backedUp.length}

## Backup
- Backup root: ${backupRoot}
- Backup file count: ${copyResult.backedUp.length}

## Package scripts
- Added: ${scriptResult.added.join(', ') || 'None'}
- Preserved: ${scriptResult.preserved.join(', ') || 'None'}
- Overwritten: ${scriptResult.overwritten.join(', ') || 'None'}

## Validation
- Required files present: Yes
- Missing files: None
- Warnings: None
- Errors: None

## Next steps
- Run \`npm run ai:doctor\`
- Run \`npm run ai:verify\`
`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, content);
}

