import { GoldenPathTemplate } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('template-registry');

import * as fs from 'fs';
import * as path from 'path';

export class TemplateRegistry {
  private _templates: Map<string, GoldenPathTemplate> = new Map();

  register(tmpl: GoldenPathTemplate): void {
    this._templates.set(tmpl.name, tmpl);
  }

  unregister(name: string): boolean {
    return this._templates.delete(name);
  }

  get(name: string): GoldenPathTemplate | undefined {
    return this._templates.get(name);
  }

  list(): GoldenPathTemplate[] {
    return Array.from(this._templates.values());
  }

  findByTag(tag: string): GoldenPathTemplate[] {
    return this.list().filter(t => t.name.includes(tag) || t.description.includes(tag));
  }

  findBestMatch(query: string): GoldenPathTemplate | undefined {
    const lower = query.toLowerCase();
    let best: GoldenPathTemplate | undefined;
    let bestScore = 0;
    for (const tmpl of this._templates.values()) {
      let score = 0;
      if (tmpl.name.toLowerCase().includes(lower)) score += 3;
      if (tmpl.description.toLowerCase().includes(lower)) score += 2;
      for (const v of tmpl.variables) {
        if (v.name.toLowerCase().includes(lower)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = tmpl;
      }
    }
    return best;
  }

  async loadFromDir(dir: string): Promise<number> {
    let count = 0;
    try {
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.template.json')) {
          const content = await fs.promises.readFile(path.join(dir, file), 'utf-8');
          const data = JSON.parse(content);
          const tmpl: GoldenPathTemplate = {
            name: data.name,
            description: data.description,
            version: data.version,
            variables: data.variables ?? [],
            files: data.files ?? [],
            conditions: new Map(Object.entries(data.conditions ?? {})),
            postActions: data.postActions ?? [],
          };
          this.register(tmpl);
          count++;
        }
      }
    } catch {
      // directory may not exist
    }
    return count;
  }

  count(): number {
    return this._templates.size;
  }

  clear(): void {
    this._templates.clear();
  }
}
