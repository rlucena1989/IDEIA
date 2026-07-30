import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import { createLogger } from '@ideia/logger';
import type { SyncConfig } from './types';

const log = createLogger('reality-sync:task-lifecycle');

export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
export type TaskSource = 'gap' | 'study' | 'feature' | 'audit' | 'manual';
export type TaskCategory = 'code' | 'test' | 'docs' | 'security' | 'performance' | 'infra' | 'ux' | 'architecture';

export interface Task {
  id: string;
  title: string;
  description: string;
  source: TaskSource;
  sourceId?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  effort: string;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface TaskLifecycleSnapshot {
  generatedAt: string;
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  tasks: Task[];
}

export function createDefaultTasksDir(root: string): string {
  const dir = path.join(root, '.ai', 'tasks');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function loadTasks(tasksDir: string): Task[] {
  const tasksPath = path.join(tasksDir, 'tasks.json');
  if (!fs.existsSync(tasksPath)) return [];
  return JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
}

export function saveTasks(tasksDir: string, tasks: Task[]): void {
  fs.writeFileSync(path.join(tasksDir, 'tasks.json'), JSON.stringify(tasks, null, 2), 'utf-8');
}

export function parseGapsForTasks(gapsPath: string): Task[] {
  if (!fs.existsSync(gapsPath)) return [];
  const content = fs.readFileSync(gapsPath, 'utf-8');
  const tasks: Task[] = [];
  const gapRegex = /\| (GS?\d+) \| (.+?) \|.+?\|\s*(🟠|🔴|🟡)\s*/g;
  let match: RegExpExecArray | null;
  while ((match = gapRegex.exec(content)) !== null) {
    const [, id, title, priorityRaw] = match;
    const priority: TaskPriority = priorityRaw === '🔴' ? 'P0' : priorityRaw === '🟠' ? 'P1' : 'P2';
    tasks.push({
      id: `task-${id.toLowerCase()}`,
      title: title.trim(),
      description: `Auto-generated from gap ${id}`,
      source: 'gap',
      sourceId: id,
      category: categorizeTask(title),
      priority,
      status: 'pending',
      effort: '',
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return tasks;
}

function categorizeTask(title: string): TaskCategory {
  const t = title.toLowerCase();
  if (t.includes('test') || t.includes('coverage') || t.includes('mutation')) return 'test';
  if (t.includes('security') || t.includes('audit') || t.includes('secret') || t.includes('policy')) return 'security';
  if (t.includes('perform') || t.includes('benchmark') || t.includes('cache') || t.includes('speed')) return 'performance';
  if (t.includes('doc') || t.includes('readme') || t.includes('study')) return 'docs';
  if (t.includes('deploy') || t.includes('ci') || t.includes('docker') || t.includes('infra')) return 'infra';
  if (t.includes('ux') || t.includes('ui') || t.includes('widget') || t.includes('theia')) return 'ux';
  if (t.includes('arch') || t.includes('clean') || t.includes('refactor')) return 'architecture';
  return 'code';
}

export function mergeTasks(existing: Task[], fresh: Task[]): Task[] {
  const map = new Map<string, Task>();
  for (const t of existing) map.set(t.id, t);
  for (const t of fresh) {
    if (!map.has(t.id)) map.set(t.id, t);
  }
  return Array.from(map.values()).sort(prioritySort);
}

function prioritySort(a: Task, b: Task): number {
  const order: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const statusOrder: Record<TaskStatus, number> = { in_progress: 0, pending: 1, blocked: 2, completed: 3, cancelled: 4 };
  const pDiff = (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
  if (pDiff !== 0) return pDiff;
  return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
}

export function updateTaskStatus(tasks: Task[], id: string, status: TaskStatus, notes?: string): Task | undefined {
  const task = tasks.find(t => t.id === id);
  if (!task) return undefined;
  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (status === 'completed') task.completedAt = new Date().toISOString();
  if (notes) task.notes = notes;
  return task;
}

export function getNextPendingTask(tasks: Task[]): Task | undefined {
  const ready = tasks.filter(t => {
    if (t.status !== 'pending') return false;
    return t.dependencies.every(depId => {
      const dep = tasks.find(d => d.id === depId);
      return dep && dep.status === 'completed';
    });
  });
  return ready.sort(prioritySort)[0];
}

export function snapshot(tasks: Task[]): TaskLifecycleSnapshot {
  const byStatus: Record<TaskStatus, number> = { pending: 0, in_progress: 0, completed: 0, cancelled: 0, blocked: 0 };
  const byPriority: Record<TaskPriority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
  }
  return { generatedAt: new Date().toISOString(), total: tasks.length, byStatus, byPriority, tasks };
}

export function generateTaskMarkdown(tasks: Task[]): string {
  const snap = snapshot(tasks);
  let md = `# Task Lifecycle — IDEIA\n\n`;
  md += `> Gerado automaticamente em ${snap.generatedAt}\n\n`;
  md += `## Sumário\n\n`;
  md += `| Métrica | Valor |\n|---------|-------|\n`;
  md += `| Total | ${snap.total} |\n`;
  md += `| ✅ Completadas | ${snap.byStatus.completed} |\n`;
  md += `| 🔄 Em progresso | ${snap.byStatus.in_progress} |\n`;
  md += `| ⏳ Pendentes | ${snap.byStatus.pending} |\n`;
  md += `| 🚫 Bloqueadas | ${snap.byStatus.blocked} |\n`;
  md += `| ❌ Canceladas | ${snap.byStatus.cancelled} |\n\n`;
  md += `### Por Prioridade\n\n`;
  md += `| Prioridade | Qtd |\n|------------|-----|\n`;
  md += `| 🔴 P0 | ${snap.byPriority.P0} |\n`;
  md += `| 🟠 P1 | ${snap.byPriority.P1} |\n`;
  md += `| 🟡 P2 | ${snap.byPriority.P2} |\n`;
  md += `| 🟢 P3 | ${snap.byPriority.P3} |\n\n`;
  md += `## Tasks\n\n`;
  md += `| ID | Título | Prioridade | Status | Categoria | Fonte |\n`;
  md += `|----|--------|------------|--------|-----------|-------|\n`;
  for (const t of tasks.sort(prioritySort)) {
    const statusIcon = t.status === 'completed' ? '✅' : t.status === 'in_progress' ? '🔄' : t.status === 'blocked' ? '🚫' : t.status === 'cancelled' ? '❌' : '⏳';
    md += `| \`${t.id}\` | ${t.title} | ${t.priority} | ${statusIcon} ${t.status} | ${t.category} | ${t.source} |\n`;
  }
  md += `\n---\n*Atualizado automaticamente pelo RealitySync Task Lifecycle Manager*\n`;
  return md;
}

export class TaskLifecycleManager extends EventEmitter {
  private tasksDir: string;
  private gapsPath: string;
  private tasksPath: string;
  private markdownPath: string;
  private tasks: Task[] = [];

  constructor(config: SyncConfig) {
    super();
    this.tasksDir = createDefaultTasksDir(config.workspaceRoot);
    this.gapsPath = config.gapsPath;
    this.tasksPath = path.join(this.tasksDir, 'tasks.json');
    this.markdownPath = path.join(this.tasksDir, 'TASKS-ATIVAS.md');
    this.tasks = loadTasks(this.tasksDir);
  }

  syncFromGaps(): number {
    const gapTasks = parseGapsForTasks(this.gapsPath);
    const before = this.tasks.length;
    this.tasks = mergeTasks(this.tasks, gapTasks);
    this.persist();
    const added = this.tasks.length - before;
    if (added > 0) {
      log.info(`Added ${added} new tasks from gaps`);
      this.emit('tasks:added', { count: added });
    }
    return added;
  }

  updateStatus(id: string, status: TaskStatus, notes?: string): boolean {
    const t = updateTaskStatus(this.tasks, id, status, notes);
    if (t) {
      this.persist();
      this.emit('task:updated', { id, status });
      return true;
    }
    return false;
  }

  getNextTask(): Task | undefined {
    return getNextPendingTask(this.tasks);
  }

  getSnapshot(): TaskLifecycleSnapshot {
    return snapshot(this.tasks);
  }

  getAllTasks(): Task[] {
    return [...this.tasks].sort(prioritySort);
  }

  persist(): void {
    saveTasks(this.tasksDir, this.tasks);
    fs.writeFileSync(this.markdownPath, generateTaskMarkdown(this.tasks), 'utf-8');
    log.info(`Tasks persisted: ${this.tasks.length} total`);
  }

  addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newTask: Task = { ...task, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.tasks.push(newTask);
    this.persist();
    this.emit('task:created', { id: newTask.id, title: newTask.title });
    return newTask;
  }
}
