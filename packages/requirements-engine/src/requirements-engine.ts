import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Requirement, RequirementCreate, RequirementSummary, RequirementUpdate } from './types';

const STORAGE_DIR = '.ai/requirements';
const STORAGE_FILE = 'requirements.json';

export class RequirementsEngine {
  private requirements: Map<string, Requirement> = new Map();

  constructor(private storagePath?: string) {}

  create(input: RequirementCreate): Requirement {
    const now = new Date().toISOString();
    const requirement: Requirement = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority ?? 'medium',
      status: 'draft',
      source: input.source,
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      owner: input.owner,
      dependsOn: input.dependsOn ?? [],
    };

    this.requirements.set(requirement.id, requirement);
    return requirement;
  }

  get(id: string): Requirement | undefined {
    return this.requirements.get(id);
  }

  update(id: string, input: RequirementUpdate): Requirement | null {
    const existing = this.requirements.get(id);
    if (!existing) return null;

    const updated: Requirement = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.requirements.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.requirements.delete(id);
  }

  list(filters?: { category?: string; status?: string; priority?: string; tag?: string }): Requirement[] {
    let result = Array.from(this.requirements.values());

    if (filters?.category) result = result.filter(r => r.category === filters.category);
    if (filters?.status) result = result.filter(r => r.status === filters.status);
    if (filters?.priority) result = result.filter(r => r.priority === filters.priority);
    if (filters?.tag) result = result.filter(r => r.tags.includes(filters.tag));

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  search(query: string): Requirement[] {
    const q = query.toLowerCase();
    return Array.from(this.requirements.values())
      .filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q)) ||
        r.tags.some(t => t.toLowerCase().includes(q)) ||
        r.id.toLowerCase().includes(q)
      );
  }

  getSummary(): RequirementSummary {
    const all = Array.from(this.requirements.values());
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const r of all) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    }

    return { total: all.length, byCategory, byStatus, byPriority };
  }

  discover(rootDir: string): DiscoveredRequirement[] {
    const discovered: DiscoveredRequirement[] = [];
    this.scanFile(path.join(rootDir, '.ai/product/vision.md'), 'vision', discovered);
    this.scanFile(path.join(rootDir, '.ai/product/business-goals.md'), 'business-goals', discovered);
    this.scanFile(path.join(rootDir, '.ai/tasks/backlog.md'), 'backlog', discovered);
    this.scanFile(path.join(rootDir, '.ai/tasks/current-task.md'), 'current-task', discovered);
    this.scanDirectory(path.join(rootDir, '.ai/tasks'), 'task', discovered);
    this.scanDirectory(path.join(rootDir, 'docs'), 'docs', discovered);
    return discovered;
  }

  save(): void {
    const basePath = this.storagePath || process.cwd();
    const dir = path.join(basePath, STORAGE_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const data = Array.from(this.requirements.values());
    fs.writeFileSync(path.join(dir, STORAGE_FILE), JSON.stringify(data, null, 2), 'utf-8');
  }

  load(): void {
    const basePath = this.storagePath || process.cwd();
    const filePath = path.join(basePath, STORAGE_DIR, STORAGE_FILE);
    if (!fs.existsSync(filePath)) return;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Requirement[];
    this.requirements.clear();
    for (const r of data) {
      this.requirements.set(r.id, r);
    }
  }

  count(): number {
    return this.requirements.size;
  }

  private scanFile(filePath: string, source: string, discovered: DiscoveredRequirement[]): void {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^#{1,3}\s+(.+)/);
      if (headerMatch) {
        const title = headerMatch[1].trim();
        if (title.length > 5 && title.length < 200) {
          discovered.push({
            title,
            source,
            file: filePath,
            line: i + 1,
            context: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 4)).join('\n'),
          });
        }
      }

      const listMatch = line.match(/^\s*[-*]\s+\[.?\]\s+(.+)/);
      if (listMatch) {
        const title = listMatch[1].trim();
        if (title.length > 10 && title.length < 200) {
          discovered.push({
            title,
            source,
            file: filePath,
            line: i + 1,
            context: line,
          });
        }
      }
    }
  }

  private scanDirectory(dirPath: string, source: string, discovered: DiscoveredRequirement[]): void {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        this.scanFile(path.join(dirPath, entry.name), source, discovered);
      }
    }
  }
}

export interface DiscoveredRequirement {
  title: string;
  source: string;
  file: string;
  line: number;
  context: string;
}

export function createRequirementsEngine(storagePath?: string): RequirementsEngine {
  return new RequirementsEngine(storagePath);
}
