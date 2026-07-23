import fs from 'node:fs';
import path from 'node:path';
import { Forecast } from './types';

function countFilesByExtension(dir: string, ext: string): number {
  let count = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countFilesByExtension(full, ext);
      } else if (entry.name.endsWith(ext)) {
        count++;
      }
    }
  } catch {
    // skip inaccessible dirs
  }
  return count;
}

function countTestFiles(root: string): number {
  return countFilesByExtension(path.join(root, 'packages'), '.test.ts');
}

function countSourceFiles(root: string): number {
  return countFilesByExtension(path.join(root, 'packages'), '.ts') + countFilesByExtension(path.join(root, 'scripts'), '.ts');
}

function countDirectories(root: string): number {
  let count = 0;
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue;
      if (entry.isDirectory()) {
        count++;
        count += countDirectories(path.join(root, entry.name));
      }
    }
  } catch {
    // skip
  }
  return count;
}

function readStateHistory(): { successes: number; failures: number } {
  try {
    if (fs.existsSync('.ai-devkit/state.json')) {
      const state = JSON.parse(fs.readFileSync('.ai-devkit/state.json', 'utf8'));
      return { successes: state.successes ?? 0, failures: state.failures ?? 0 };
    }
  } catch {
    // ignore
  }
  return { successes: 0, failures: 0 };
}

export function predictProjectLoad(): Forecast {
  const root = process.cwd();
  const srcFiles = countSourceFiles(root);
  const testFiles = countTestFiles(root);
  const totalDirs = countDirectories(root);
  const history = readStateHistory();

  // Estimated jobs based on project complexity
  const complexity = srcFiles + testFiles + totalDirs;
  const estimatedJobs = Math.max(1, Math.min(25, Math.ceil(complexity / 30)));

  // Estimated duration (ms): base + per-job overhead
  const estimatedDurationMs = estimatedJobs * 500 + srcFiles * 10;

  // Risk assessment based on multiple signals
  const totalRuns = history.successes + history.failures;
  let risk: Forecast['risk'] = 'low';

  if (srcFiles > 300) risk = 'high';
  else if (srcFiles > 100) risk = 'medium';

  if (totalRuns > 5 && history.successes / totalRuns < 0.5) {
    risk = 'high';
  }

  if (testFiles === 0) {
    risk = 'medium';
  }

  return {
    estimatedJobs,
    estimatedDurationMs,
    risk
  };
}
