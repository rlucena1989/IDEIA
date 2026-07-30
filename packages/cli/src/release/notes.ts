import { execSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';
const logger = createLogger('notes');

/** Interface que define a estrutura de release notes result. */
export interface ReleaseNotesResult {
  version: string;
  date: string;
  features: string[];
  fixes: string[];
  breakingChanges: string[];
  other: string[];
}

/**
 * Gera release notes.
 * @param fromTag - Valor tag.
 * @param toTag - Valor tag.
 * @param cwd - Valor cwd.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function generateReleaseNotes(fromTag: string, toTag: string, cwd?: string): ReleaseNotesResult {
  const workDir = cwd || process.cwd();
  const notes: ReleaseNotesResult = {
    version: toTag,
    date: new Date().toISOString().split('T')[0] ?? '',
    features: [],
    fixes: [],
    breakingChanges: [],
    other: [],
  };

  try {
    let log: string;
    try {
      log = execSync(`git log ${fromTag}..${toTag} --oneline --format="%s"`, {
        cwd: workDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      log = execSync('git log --oneline -50 --format="%s"', {
        cwd: workDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      });
    }

    for (const line of log.split('\n').filter(Boolean)) {
      const msg = line.replace(/^[a-f0-9]+\s+/, '');
      if (/!:/i.test(msg) || /^breaking/i.test(msg)) notes.breakingChanges.push(msg);
      else if (/^feat/i.test(msg) || /^feature/i.test(msg) || /^add/i.test(msg)) notes.features.push(msg);
      else if (/^fix/i.test(msg) || /^bug/i.test(msg) || /^hotfix/i.test(msg)) notes.fixes.push(msg);
      else notes.other.push(msg);
    }
  } catch {
    notes.features.push('N/A â€” git log nao disponivel');
  }

  return notes;
}

/**
 * Formata release notes.
 * @param notes - Valor notes.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function formatReleaseNotes(notes: ReleaseNotesResult): string {
  const lines: string[] = [
    `# Release ${notes.version}`,
    `**Data:** ${notes.date}`,
    '',
  ];

  if (notes.breakingChanges.length > 0) {
    lines.push('## [BREAKING] Breaking Changes');
    for (const b of notes.breakingChanges) lines.push(`- ${b}`);
    lines.push('');
  }

  if (notes.features.length > 0) {
    lines.push('## [FEATURE] Features');
    for (const f of notes.features) lines.push(`- ${f}`);
    lines.push('');
  }

  if (notes.fixes.length > 0) {
    lines.push('## [FIX] Bug Fixes');
    for (const f of notes.fixes) lines.push(`- ${f}`);
    lines.push('');
  }

  if (notes.other.length > 0) {
    lines.push('## [OTHER] Outras Mudancas');
    for (const o of notes.other) lines.push(`- ${o}`);
    lines.push('');
  }

  return lines.join('\n');
}
