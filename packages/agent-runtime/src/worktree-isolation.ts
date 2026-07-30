import { execSync } from 'child_process'
import * as path from 'path'
import * as fsp from 'fs/promises'
import { createLogger } from '@ideia/logger'

const logger = createLogger('agent-runtime:worktree')

export interface WorktreeSession {
  id: string
  basePath: string
  worktreePath: string
  branch: string
  createdAt: string
  status: 'active' | 'merged' | 'abandoned'
}

export class WorktreeIsolation {
  private sessions: Map<string, WorktreeSession> = new Map()
  private repoRoot: string

  constructor(repoRoot: string) {
    this.repoRoot = path.resolve(repoRoot)
  }

  async create(taskId: string, baseBranch: string = 'main'): Promise<WorktreeSession> {
    const branch = `agent/${taskId}/${Date.now()}`
    const worktreePath = path.join(this.repoRoot, '..', `.worktrees/${taskId}`)

    try {
      execSync(`git branch ${branch} ${baseBranch}`, {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 10000,
      })

      execSync(`git worktree add ${worktreePath} ${branch}`, {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 15000,
      })

      const session: WorktreeSession = {
        id: taskId,
        basePath: this.repoRoot,
        worktreePath,
        branch,
        createdAt: new Date().toISOString(),
        status: 'active',
      }

      this.sessions.set(taskId, session)
      logger.info('Worktree created', { taskId, branch, path: worktreePath })

      return session
    } catch (err) {
      logger.error('Failed to create worktree', { taskId, error: String(err) })
      throw new Error(`Worktree creation failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async merge(taskId: string, commitMessage: string): Promise<void> {
    const session = this.sessions.get(taskId)
    if (!session) throw new Error(`Session ${taskId} not found`)

    try {
      execSync(`git add -A`, { cwd: session.worktreePath, stdio: 'pipe', timeout: 10000 })
      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
        cwd: session.worktreePath,
        stdio: 'pipe',
        timeout: 10000,
      })

      execSync(`git checkout ${session.branch}`, { cwd: this.repoRoot, stdio: 'pipe', timeout: 10000 })
      execSync(`git merge --no-ff ${session.branch} -m "Merge agent worktree: ${commitMessage.slice(0, 80)}"`, {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 15000,
      })

      session.status = 'merged'
      logger.info('Worktree merged', { taskId, branch: session.branch })
    } catch (err) {
      logger.error('Failed to merge worktree', { taskId, error: String(err) })
      throw new Error(`Worktree merge failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async abandon(taskId: string): Promise<void> {
    const session = this.sessions.get(taskId)
    if (!session) throw new Error(`Session ${taskId} not found`)

    try {
      execSync(`git worktree remove ${session.worktreePath}`, {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 10000,
      })

      execSync(`git branch -D ${session.branch}`, {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 10000,
      })

      session.status = 'abandoned'
      logger.info('Worktree abandoned', { taskId, branch: session.branch })
    } catch (err) {
      logger.error('Failed to abandon worktree', { taskId, error: String(err) })
    }
  }

  async cleanup(): Promise<void> {
    for (const [taskId, session] of this.sessions) {
      if (session.status === 'active') {
        try {
          await this.abandon(taskId)
        } catch { /* skip */ }
      }
    }

    try {
      execSync(`git worktree prune`, { cwd: this.repoRoot, stdio: 'pipe', timeout: 10000 })
    } catch { /* ok */ }

    logger.info('Worktree cleanup complete')
  }

  getSession(taskId: string): WorktreeSession | undefined {
    return this.sessions.get(taskId)
  }

  listActive(): WorktreeSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active')
  }

  async runInWorktree(taskId: string, command: string): Promise<{ stdout: string; stderr: string }> {
    const session = this.sessions.get(taskId)
    if (!session) throw new Error(`Session ${taskId} not found`)

    try {
      const stdout = execSync(command, {
        cwd: session.worktreePath,
        stdio: 'pipe',
        timeout: 30000,
        encoding: 'utf-8',
      })
      return { stdout: stdout.trim(), stderr: '' }
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message?: string }
      return {
        stdout: (e.stdout || '').toString().trim(),
        stderr: (e.stderr || e.message || String(err)).toString().trim(),
      }
    }
  }
}
