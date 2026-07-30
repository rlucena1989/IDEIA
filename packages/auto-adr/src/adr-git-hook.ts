import { AdrCli } from './adr-cli';
import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const log = createLogger('adr:git-hook');

export interface ChangeEvent {
  type: 'add' | 'modify' | 'delete';
  file: string;
  diff?: string;
}

export interface AdrSuggestion {
  title: string;
  reason: string;
  context: string;
  decision: string;
  consequences: string[];
}

export class AdrGitHook {
  private adrCli: AdrCli;
  private bus: EventBus;
  private adrDir: string;

  constructor(bus: EventBus, adrDir?: string) {
    this.adrCli = new AdrCli(bus, adrDir);
    this.bus = bus;
    this.adrDir = adrDir ?? path.join(process.cwd(), 'docs', 'adr');
  }

  async autoCommitAdr(adrTitle: string, adrId: string): Promise<boolean> {
    try {
      const adrFile = fs.readdirSync(this.adrDir)
        .find(f => f.startsWith(`ADR-${adrId}-`));
      if (!adrFile) return false;

      const filePath = path.join(this.adrDir, adrFile);
      execSync(`git add "${filePath}"`, { cwd: process.cwd() });
      execSync(`git commit -m "docs(adr): ${adrTitle} [ADR-${adrId}]" --no-verify`, { cwd: process.cwd() });
      log.info(`Auto-committed ADR ${adrId}: ${adrTitle}`);
      return true;
    } catch (_err) {
      log.warn(`Could not auto-commit ADR ${adrId}: git not available or not a repository`);
      return false;
    }
  }

  async suggestOnChanges(changes: ChangeEvent[]): Promise<AdrSuggestion[]> {
    const suggestions: AdrSuggestion[] = [];

    const configChanges = changes.filter(c =>
      c.file.includes('tsconfig') ||
      c.file.includes('package.json') ||
      c.file.match(/\.yaml$/) ||
      c.file.match(/\.yml$/)
    );
    if (configChanges.length > 0) {
      suggestions.push({
        title: 'Configuration Change Analysis',
        reason: `${configChanges.length} configuration file(s) modified`,
        context: `Files: ${configChanges.map(c => c.file).join(', ')}`,
        decision: 'Review configuration changes and document architectural impact',
        consequences: ['Configuration drift may affect system behavior', 'Dependency changes may require version bumps'],
      });
    }

    const archChanges = changes.filter(c =>
      c.file.includes('src/architecture') ||
      c.file.includes('src/domain') ||
      c.file.includes('src/contracts')
    );
    if (archChanges.length > 0) {
      suggestions.push({
        title: 'Architecture Change Detected',
        reason: `${archChanges.length} architecture-related file(s) modified`,
        context: `Files: ${archChanges.map(c => c.file).join(', ')}`,
        decision: 'Document the architectural shift and its rationale',
        consequences: ['Module boundaries may have shifted', 'Contracts between modules may need updating'],
      });
    }

    const apiChanges = changes.filter(c =>
      c.file.match(/\/api\//) ||
      c.file.match(/\/protocol\//) ||
      c.file.match(/interface/) ||
      c.file.endsWith('-service.ts')
    );
    if (apiChanges.length > 0) {
      suggestions.push({
        title: 'API/Protocol Change',
        reason: `${apiChanges.length} API or protocol file(s) modified`,
        context: `Files: ${apiChanges.map(c => c.file).join(', ')}`,
        decision: 'Document the API contract change and version impact',
        consequences: ['Consumer contracts may break', 'Version bump may be required'],
      });
    }

    if (suggestions.length > 0) {
      await this.bus.emit({
        type: 'adr:git-hook-suggestions',
        source: 'adr-git-hook',
        payload: { suggestions, changeCount: changes.length },
      });
    }

    return suggestions;
  }

  async onPreCommit(changes: ChangeEvent[]): Promise<{ shouldBlock: boolean; message: string }> {
    const suggestions = await this.suggestOnChanges(changes);
    if (suggestions.length > 0) {
      const titles = suggestions.map(s => `  - ${s.title}`).join('\n');
      return {
        shouldBlock: false,
        message: `Architectural changes detected — consider creating ADR(s):\n${titles}\nRun "IDEIA adr new <title>" to document.`,
      };
    }
    return { shouldBlock: false, message: 'No architectural changes detected.' };
  }

  async detectArchitecturalChanges(baseDir: string): Promise<ChangeEvent[]> {
    const changes: ChangeEvent[] = [];
    const gitDir = path.join(baseDir, '.git');
    if (!fs.existsSync(gitDir)) return changes;

    try {
      const output = execSync('git diff --name-status HEAD~1', { cwd: baseDir, encoding: 'utf-8' });
      for (const line of output.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const status = parts[0];
          const file = parts.slice(1).join(' ');
          if (status === 'A') changes.push({ type: 'add', file });
          else if (status === 'M' || status === 'R') changes.push({ type: 'modify', file });
          else if (status === 'D') changes.push({ type: 'delete', file });
        }
      }
    } catch {
      log.warn('Could not run git diff — not a git repository or git not available');
    }

    return changes;
  }
}

export function createAdrGitHook(bus: EventBus, adrDir?: string): AdrGitHook {
  return new AdrGitHook(bus, adrDir);
}
