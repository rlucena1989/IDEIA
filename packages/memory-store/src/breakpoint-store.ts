import { createLogger } from '@ideia/logger';
import fs from 'fs';
import path from 'path';
import { EventBus } from '@ideia/event-bus';
const logger = createLogger('memory-store');

export interface Breakpoint {
  id: string;
  filePath: string;
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  enabled: boolean;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BreakpointGroup {
  name: string;
  breakpoints: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export class BreakpointStore {
  private breakpoints: Map<string, Breakpoint> = new Map();
  private groups: Map<string, BreakpointGroup> = new Map();
  private filePath?: string;
  private _eventBus?: EventBus;
  private _loaded = false;

  constructor(filePath?: string, eventBus?: EventBus) {
    this.filePath = filePath;
    this._eventBus = eventBus;
  }

  get eventBus(): EventBus | undefined {
    return this._eventBus;
  }

  set eventBus(bus: EventBus | undefined) {
    this._eventBus = bus;
  }

  addBreakpoint(bp: Omit<Breakpoint, 'id' | 'createdAt' | 'updatedAt'>): Breakpoint {
    this.ensureLoaded();
    const id = `bp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const full: Breakpoint = { ...bp, id, createdAt: now, updatedAt: now };
    this.breakpoints.set(id, full);
    this.save();
    this.emitEvent('breakpoint.added', full);
    return full;
  }

  updateBreakpoint(id: string, updates: Partial<Omit<Breakpoint, 'id' | 'createdAt'>>): Breakpoint | null {
    this.ensureLoaded();
    const existing = this.breakpoints.get(id);
    if (!existing) return null;
    const updated: Breakpoint = { ...existing, ...updates, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    this.breakpoints.set(id, updated);
    this.save();
    this.emitEvent('breakpoint.updated', updated);
    return updated;
  }

  removeBreakpoint(id: string): boolean {
    this.ensureLoaded();
    const removed = this.breakpoints.delete(id);
    if (removed) {
      for (const group of this.groups.values()) {
        group.breakpoints = group.breakpoints.filter(bpId => bpId !== id);
        group.updatedAt = new Date().toISOString();
      }
      this.save();
      this.emitEvent('breakpoint.removed', { id });
    }
    return removed;
  }

  getBreakpoint(id: string): Breakpoint | undefined {
    this.ensureLoaded();
    return this.breakpoints.get(id);
  }

  getBreakpointsForFile(filePath: string): Breakpoint[] {
    this.ensureLoaded();
    const normalized = filePath.replace(/\\/g, '/');
    const result: Breakpoint[] = [];
    for (const bp of this.breakpoints.values()) {
      if (bp.filePath.replace(/\\/g, '/') === normalized) {
        result.push(bp);
      }
    }
    return result.sort((a, b) => a.line - b.line);
  }

  getAllBreakpoints(): Breakpoint[] {
    this.ensureLoaded();
    return Array.from(this.breakpoints.values()).sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line);
  }

  getEnabledBreakpoints(): Breakpoint[] {
    this.ensureLoaded();
    return this.getAllBreakpoints().filter(bp => bp.enabled);
  }

  toggleBreakpoint(id: string): Breakpoint | null {
    const bp = this.breakpoints.get(id);
    if (!bp) return null;
    return this.updateBreakpoint(id, { enabled: !bp.enabled });
  }

  createGroup(name: string, description?: string): BreakpointGroup {
    this.ensureLoaded();
    const now = new Date().toISOString();
    const group: BreakpointGroup = { name, breakpoints: [], description, createdAt: now, updatedAt: now };
    this.groups.set(name, group);
    this.save();
    return group;
  }

  addBreakpointToGroup(groupName: string, breakpointId: string): boolean {
    this.ensureLoaded();
    const group = this.groups.get(groupName);
    if (!group || !this.breakpoints.has(breakpointId)) return false;
    if (!group.breakpoints.includes(breakpointId)) {
      group.breakpoints.push(breakpointId);
      group.updatedAt = new Date().toISOString();
      this.save();
    }
    return true;
  }

  removeBreakpointFromGroup(groupName: string, breakpointId: string): boolean {
    const group = this.groups.get(groupName);
    if (!group) return false;
    const idx = group.breakpoints.indexOf(breakpointId);
    if (idx === -1) return false;
    group.breakpoints.splice(idx, 1);
    group.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  getGroups(): BreakpointGroup[] {
    this.ensureLoaded();
    return Array.from(this.groups.values());
  }

  save(): void {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = JSON.stringify({
      breakpoints: Array.from(this.breakpoints.entries()),
      groups: Array.from(this.groups.entries()),
    }, null, 2);
    const tmpPath = this.filePath + '.tmp';
    fs.writeFileSync(tmpPath, data, 'utf-8');
    fs.renameSync(tmpPath, this.filePath);
  }

  load(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as { breakpoints: [string, Breakpoint][]; groups: [string, BreakpointGroup][] };
      this.breakpoints = new Map(parsed.breakpoints ?? []);
      this.groups = new Map(parsed.groups ?? []);
    } catch (__err) {
      logger.error('Error in load', { error: String(__err) });
      if (this.filePath && fs.existsSync(this.filePath)) {
        fs.renameSync(this.filePath, this.filePath + '.corrupted');
      }
    }
  }

  clear(): void {
    this.breakpoints.clear();
    this.groups.clear();
    this.save();
  }

  get breakpointCount(): number {
    return this.breakpoints.size;
  }

  get groupCount(): number {
    return this.groups.size;
  }

  private ensureLoaded(): void {
    if (!this._loaded && this.filePath) {
      this.load();
      this._loaded = true;
    }
  }

  private emitEvent(type: string, data: unknown): void {
    if (this._eventBus) {
      this._eventBus.emit({
        type,
        source: 'breakpoint-store',
        payload: data as Record<string, unknown>,
        metadata: { timestamp: new Date().toISOString() },
      }).catch((_err: any) => logger.error('Error in emitEvent', { error: String(_err) }));
    }
  }
}

export function createBreakpointStore(filePath?: string, eventBus?: EventBus): BreakpointStore {
  return new BreakpointStore(filePath, eventBus);
}
