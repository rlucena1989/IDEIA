import { SteeringFile, SteeringMode } from './types'
import { createLogger } from '@ideia/logger';
import * as fsp from 'fs/promises'
import * as path from 'path'
const logger = createLogger('steering-file-manager');

export class SteeringFileManager {
  private files: SteeringFile[] = []

  register(file: SteeringFile): void {
    this.files = this.files.filter(f => f.path !== file.path)
    this.files.push(file)
  }

  unregister(path: string): void {
    this.files = this.files.filter(f => f.path !== path)
  }

  getByMode(mode: SteeringMode): SteeringFile[] {
    return this.files.filter(f => f.mode === mode)
  }

  getForFileContext(filePath: string): SteeringFile[] {
    const result: SteeringFile[] = []
    for (const file of this.files) {
      if (file.mode === 'always') {
        result.push(file)
      } else if (file.mode === 'fileMatch' && file.fileMatch) {
        for (const pattern of file.fileMatch) {
          if (this.matchGlob(pattern, filePath)) {
            result.push(file)
            break
          }
        }
      }
    }
    return result
  }

  getManual(): SteeringFile[] {
    return this.files.filter(f => f.mode === 'manual')
  }

  getAll(): SteeringFile[] {
    return [...this.files]
  }

  async loadFromAgentsMd(projectRoot: string): Promise<SteeringFile | null> {
    const agentsPath = path.join(projectRoot, 'AGENTS.md')
    try {
      await fsp.access(agentsPath)
      const content = await fsp.readFile(agentsPath, 'utf-8')
      const file: SteeringFile = {
        path: 'AGENTS.md',
        mode: 'always',
        content,
        description: 'Master project steering file — rules, architecture, state',
      }
      this.register(file)
      return file
    } catch {
      return null
    }
  }

  async loadFromProject(projectRoot: string): Promise<SteeringFile[]> {
    const loaded: SteeringFile[] = []
    const agentsFile = await this.loadFromAgentsMd(projectRoot)
    if (agentsFile) loaded.push(agentsFile)

    const aiDir = path.join(projectRoot, '.ai')
    try {
      const entries = await fsp.readdir(aiDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.yaml'))) {
          const filePath = path.join(aiDir, entry.name)
          const content = await fsp.readFile(filePath, 'utf-8')
          const file: SteeringFile = {
            path: `.ai/${entry.name}`,
            mode: 'always',
            content: content.slice(0, 4000),
            description: `AI context: ${entry.name}`,
          }
          this.register(file)
          loaded.push(file)
        }
      }
    } catch { /* .ai may not exist */ }

    return loaded
  }

  toContextString(): string {
    const always = this.getByMode('always')
    const fileMatch = this.getByMode('fileMatch')
    const manual = this.getManual()

    const parts: string[] = ['## Steering Context']
    if (always.length > 0) {
      parts.push('### Always Active')
      for (const f of always) {
        parts.push(`**${f.path}**: ${f.description}`)
        parts.push(f.content.slice(0, 1000))
      }
    }
    if (fileMatch.length > 0) {
      parts.push(`### File-Match Rules (${fileMatch.length} files)`)
      for (const f of fileMatch) {
        parts.push(`- \`${f.path}\` matches: ${f.fileMatch?.join(', ')}`)
      }
    }
    if (manual.length > 0) {
      parts.push(`### Manual References (${manual.length})`)
      for (const f of manual) {
        parts.push(`- \`${f.path}\`: ${f.description}`)
      }
    }
    return parts.join('\n\n')
  }

  clear(): void {
    this.files = []
  }

  private matchGlob(pattern: string, filePath: string): boolean {
    const regexStr = '^' + pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*\//g, '(.+\\\\/)?')
      .replace(/\*/g, '[^/\\\\]*')
      + '$'
    return new RegExp(regexStr).test(filePath)
  }
}
