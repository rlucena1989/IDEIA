import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';
import { Instruction, InstructionScope, InstructionPriority, InstructionStatus } from './types';

const STORAGE_DIR = '.ai/instructions';

export class PersistentInstructions {
  private instructions: Map<string, Instruction> = new Map();

  constructor(private storagePath?: string) {}

  add(title: string, content: string, scope: InstructionScope, priority: InstructionPriority = 'medium', tags: string[] = [], source: 'user' | 'ai' | 'learned' = 'user', appliesTo?: string[]): Instruction {
    const existing = this.findByTitle(title);
    const supersededBy = existing ? existing.id : undefined;
    const now = new Date().toISOString();
    const version = existing ? existing.version + 1 : 1;

    if (existing) {
      existing.status = 'superseded';
      existing.supersededBy = undefined;
      this.instructions.set(existing.id, existing);
    }

    const instruction: Instruction = {
      id: randomUUID(),
      title,
      content,
      scope,
      priority,
      status: 'active',
      tags,
      source,
      createdAt: now,
      updatedAt: now,
      supersededBy,
      appliesTo,
      version,
    };

    if (existing) {
      existing.supersededBy = instruction.id;
      this.instructions.set(existing.id, existing);
    }

    this.instructions.set(instruction.id, instruction);
    return instruction;
  }

  get(id: string): Instruction | undefined {
    return this.instructions.get(id);
  }

  findByTitle(title: string): Instruction | undefined {
    return Array.from(this.instructions.values()).find(i => i.title === title && i.status === 'active');
  }

  listActive(scope?: InstructionScope): Instruction[] {
    let result = Array.from(this.instructions.values()).filter(i => i.status === 'active');
    if (scope) result = result.filter(i => i.scope === scope);
    return result.sort((a, b) => {
      const pri: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (pri[a.priority] ?? 99) - (pri[b.priority] ?? 99);
    });
  }

  archive(id: string): boolean {
    const inst = this.instructions.get(id);
    if (!inst) return false;
    inst.status = 'archived';
    return true;
  }

  detectConflicts(): Instruction[][] {
    const active = this.listActive();
    const conflicts: Instruction[][] = [];

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (this.hasConflict(active[i], active[j])) {
          active[i].status = 'conflict';
          active[j].status = 'conflict';
          active[i].conflicts = [...(active[i].conflicts || []), active[j].id];
          active[j].conflicts = [...(active[j].conflicts || []), active[i].id];
          this.instructions.set(active[i].id, active[i]);
          this.instructions.set(active[j].id, active[j]);
          conflicts.push([active[i], active[j]]);
        }
      }
    }

    return conflicts;
  }

  search(query: string): Instruction[] {
    const q = query.toLowerCase();
    return Array.from(this.instructions.values()).filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.content.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  save(): void {
    const basePath = this.storagePath || process.cwd();
    const dir = path.join(basePath, STORAGE_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const data = Array.from(this.instructions.values());
    fs.writeFileSync(path.join(dir, 'instructions.json'), JSON.stringify(data, null, 2), 'utf-8');
  }

  load(): void {
    const basePath = this.storagePath || process.cwd();
    const filePath = path.join(basePath, STORAGE_DIR, 'instructions.json');
    if (!fs.existsSync(filePath)) return;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Instruction[];
    this.instructions.clear();
    for (const i of data) {
      this.instructions.set(i.id, i);
    }
  }

  count(): number {
    return this.instructions.size;
  }

  private hasConflict(a: Instruction, b: Instruction): boolean {
    if (a.scope !== b.scope) return false;
    if (a.priority === 'critical' && b.priority === 'critical' && a.title !== b.title) {
      return this.overlappingScopes(a.appliesTo, b.appliesTo);
    }
    if (a.content.includes('not') && b.content.includes('not')) {
      const aNeg = a.content.match(/not|never|don'?t|avoid/gi);
      const bNeg = b.content.match(/not|never|don'?t|avoid/gi);
      if (aNeg && bNeg && aNeg.length > 0 && bNeg.length > 0) return false;
    }
    return false;
  }

  private overlappingScopes(a?: string[], b?: string[]): boolean {
    if (!a || !b) return true;
    return a.some(s => b.includes(s));
  }
}

export function createPersistentInstructions(storagePath?: string): PersistentInstructions {
  return new PersistentInstructions(storagePath);
}
