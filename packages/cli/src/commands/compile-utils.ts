import fs from 'node:fs';
import path from 'node:path';
import type { LawsConfig, ProjectManifest } from './compile-types';
import { readLaws, readManifest, readGlobalRules, readPolicies } from './compile-readers';
import { COMPILERS, TARGET_PATHS } from './compile-compilers';
import { getIO } from '../io';
import { printLine } from '../utils/output';

export * from './compile-types';
export { readLaws, readManifest, readGlobalRules, readPolicies, getBaseRules, getProjectName, getFramework, getCoverageMin } from './compile-readers';
export { COMPILERS, TARGET_PATHS, compileClaude, compileCursor, compileCopilot, compileWindsurf, compileCline, compileGemini, compileContinue, compileZed, compileAmazonQ, compileCodex, compileAider, compileCursorMdc, compileGithubActions } from './compile-compilers';
export { compileAll, getPathScopedOutputs } from './compile-path-scoped';

const WATCHED_FILES = ['.ai/laws.yaml', '.ai/manifest.yaml', '.ai/rules/global.rules.md', '.ai/memory.json'];

export function startWatch(root: string, intervalMs: number): NodeJS.Timeout {
  const initialModTimes = new Map<string, number>();
  for (const file of WATCHED_FILES) {
    const fp = path.join(root, file);
    try {
      initialModTimes.set(file, fs.statSync(fp).mtimeMs);
    } catch {
      initialModTimes.set(file, 0);
    }
  }

  return setInterval(() => {
    let changed = false;
    for (const file of WATCHED_FILES) {
      const fp = path.join(root, file);
      try {
        const mtime = fs.statSync(fp).mtimeMs;
        if (mtime !== initialModTimes.get(file)) {
          initialModTimes.set(file, mtime);
          changed = true;
        }
      } catch {
        // file removed, ignore
      }
    }

    if (changed) {
      const manifest = readManifest(root);
      const laws = readLaws(root);
      const globalRules = readGlobalRules(root);
      const policies = readPolicies(root);

      for (const target of Object.keys(COMPILERS) as Array<keyof typeof COMPILERS>) {
        const fp = path.join(root, TARGET_PATHS[target]);
        const content = COMPILERS[target](manifest, laws, globalRules, policies);
        getIO().fs.mkDir(path.dirname(fp), true);
        getIO().fs.write(fp, content);
      }
      printLine(`[WATCH] Recompiled at ${new Date().toLocaleTimeString()}`);
    }
  }, intervalMs);
}
