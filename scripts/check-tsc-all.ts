import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const rootTsconfig = join(ROOT, 'tsconfig.json');

function main(): void {
  try {
    const tscPath = join(ROOT, 'node_modules', '.bin', 'tsc');
    const result = execFileSync(tscPath, ['--noEmit', '--project', rootTsconfig], {
      cwd: ROOT, encoding: 'utf8', timeout: 120000, windowsHide: true,
    });
    process.stdout.write(result.toString());
    console.log(`\n# TypeScript Compilation Check`);
    console.log('**Resultado:** ✅ All packages compile successfully\n');
    process.exit(0);
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const errMsg = (e.stderr || e.stdout || e.message || '').trim();
    console.log(`\n# TypeScript Compilation Check`);
    console.log('**Resultado:** ❌ Compilation errors found\n');
    if (errMsg) console.log(errMsg.slice(0, 2000));
    process.exit(1);
  }
}

main();
