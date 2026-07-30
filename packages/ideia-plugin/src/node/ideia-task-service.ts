import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { EventBus } from '@ideia/event-bus';
import { IDEIA_TaskService } from '../common/ideia-protocol';
import { Checkpoint, FileChange, TaskSpec } from '../common/ideia-types';

function assertWithinWorkspace(workspaceRoot: string, fullPath: string): void {
  const normalizedRoot = path.resolve(workspaceRoot);
  const normalizedFull = path.resolve(fullPath);
  if (!normalizedFull.startsWith(normalizedRoot + path.sep) && normalizedFull !== normalizedRoot) {
    throw new Error(`Path traversal blocked: ${fullPath} escapes workspace ${workspaceRoot}`);
  }
}

@injectable()
export class IDEIA_TaskRunner implements IDEIA_TaskService {
  private tasks = new Map<string, TaskSpec>();
  private workspaceRoot: string;
  private taskLogs = new Map<string, string[]>();

  constructor(
    @inject(EventBus) private eventBus: EventBus,
  ) {
    this.workspaceRoot = process.env.IDEIA_WORKSPACE_ROOT || process.cwd();
  }

  async getTasks(): Promise<TaskSpec[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: string): Promise<TaskSpec | undefined> {
    return this.tasks.get(id);
  }

  async cancelTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'blocked';
      this.log(task.id, 'Task cancelled by user');
      await this.eventBus.emit({
        type: 'task.blocked',
        source: 'ideia-task',
        payload: { task: { id } },
      });
    }
  }

  async retryTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'queued';
      this.log(task.id, 'Task queued for retry');
      await this.eventBus.emit({
        type: 'task.updated',
        source: 'ideia-task',
        payload: { task: { id } },
      });
    }
  }

  async getTaskLogs(id: string): Promise<string[]> {
    return this.taskLogs.get(id) || [];
  }

  createTask(title: string, description: string, agentId: string): TaskSpec {
    const task: TaskSpec = {
      id: uuid(),
      title,
      description,
      status: 'queued',
      agentId,
      checkpoints: [],
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    this.log(task.id, `Task created: ${title}`);

    this.eventBus.emit({
      type: 'task.created',
      source: 'ideia-task',
      payload: { task: { id: task.id, title } },
    }).catch(() => {});

    return task;
  }

  async applyChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      try {
        const targetPath = path.resolve(path.join(this.workspaceRoot, change.path));
        assertWithinWorkspace(this.workspaceRoot, targetPath);

        switch (change.status) {
          case 'added':
          case 'modified': {
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(targetPath, change.modifiedContent, 'utf-8');
            this.log('system', `Written: ${change.path}`);
            break;
          }
          case 'deleted': {
            if (fs.existsSync(targetPath)) {
              fs.unlinkSync(targetPath);
              this.log('system', `Deleted: ${change.path}`);
            }
            break;
          }
        }
      } catch (err) {
        this.log('system', `Error applying ${change.path}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    assertWithinWorkspace(this.workspaceRoot, fullPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(fullPath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<{ path: string }> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    assertWithinWorkspace(this.workspaceRoot, fullPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf-8');
    this.log('system', `Written: ${filePath}`);
    return { path: filePath };
  }

  async deleteFile(filePath: string): Promise<{ path: string }> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    assertWithinWorkspace(this.workspaceRoot, fullPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.log('system', `Deleted: ${filePath}`);
    }
    return { path: filePath };
  }

  async runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const [cmd, ...args] = this.parseCommand(command);
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile(cmd, args, {
          cwd: this.workspaceRoot,
          encoding: 'utf-8',
          timeout: 60000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        }, (err, out) => { if (err) reject(err); else resolve(out); });
      });
      this.log('system', `Command succeeded: ${command.substring(0, 80)}`);
      return { stdout, stderr: '' };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      this.log('system', `Command failed: ${command.substring(0, 80)}`);
      return { stdout: e.stdout || '', stderr: e.stderr || e.message || '' };
    }
  }

  private parseCommand(command: string): [string, ...string[]] {
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [command];
    return [(parts[0] ?? '').replace(/"/g, ''), ...parts.slice(1).map(a => a.replace(/"/g, ''))] as [string, ...string[]];
  }

  async searchFiles(pattern: string): Promise<string[]> {
    const results: string[] = [];
    this.walkDirectory(this.workspaceRoot, results, pattern);
    return results;
  }

  async getWorkspaceInfo(): Promise<{ root: string; files: number; languages: string[] }> {
    const languages = new Set<string>();
    let files = 0;
    this.walkDirectory(this.workspaceRoot, [], '', (filePath) => {
      files++;
      const ext = path.extname(filePath).slice(1);
      if (ext) languages.add(ext);
    });
    return { root: this.workspaceRoot, files, languages: Array.from(languages) };
  }

  private walkDirectory(
    dir: string,
    results: string[],
    pattern: string,
    onFile?: (filePath: string) => void,
  ): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.walkDirectory(fullPath, results, pattern, onFile);
        }
      } else if (entry.isFile()) {
        if (onFile) onFile(fullPath);
        if (pattern && fullPath.includes(pattern)) {
          results.push(fullPath);
        }
      }
    }
  }

  private log(taskId: string, message: string): void {
    const logs = this.taskLogs.get(taskId) || [];
    logs.push(`[${new Date().toISOString()}] ${message}`);
    this.taskLogs.set(taskId, logs);
  }

  private async isCliAvailable(): Promise<boolean> {
    try {
      const result = await this.runCommand('ai-devkit --version');
      return result.stdout.includes('ai-devkit');
    } catch {
      return false;
    }
  }
}
