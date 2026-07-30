import * as fsp from 'fs/promises'
import * as path from 'path'
import { createLogger } from '@ideia/logger'
import { ScanResult } from './types'

const logger = createLogger('manifest-scanner')

const WORKSPACE_ROOT = path.resolve(process.cwd())

export class CodeScanner {
  async scan(): Promise<ScanResult> {
    const [packages, commands, events] = await Promise.all([
      this.scanPackages(),
      this.scanCommands(),
      this.scanEvents(),
    ])
    const result: ScanResult = {
      packages,
      interfaces: [],
      endpoints: [],
      commands,
      agents: [],
      events,
      tools: [],
      adapters: [],
    }
    logger.info('Code scan complete', { packages: packages.length, commands: commands.length, events: events.length })
    return result
  }

  private async scanPackages(): Promise<string[]> {
    const packagesDir = path.join(WORKSPACE_ROOT, 'packages')
    try {
      const entries = await fsp.readdir(packagesDir, { withFileTypes: true })
      return entries.filter(e => e.isDirectory()).map(e => e.name).sort()
    } catch {
      return []
    }
  }

  private async scanCommands(): Promise<string[]> {
    const cliDir = path.join(WORKSPACE_ROOT, 'packages', 'cli', 'src')
    try {
      const files = await this.findFiles(cliDir, '.ts')
      const commandFiles = files.filter(f => f.includes('command') || f.includes('Command'))
      return commandFiles.map(f => path.relative(cliDir, f))
    } catch {
      return []
    }
  }

  private async scanEvents(): Promise<string[]> {
    const eventBusDir = path.join(WORKSPACE_ROOT, 'packages', 'event-bus', 'src')
    try {
      const files = await this.findFiles(eventBusDir, '.ts')
      return files.map(f => path.relative(eventBusDir, f))
    } catch {
      return []
    }
  }

  private async findFiles(dir: string, ext: string): Promise<string[]> {
    const result: string[] = []
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          const sub = await this.findFiles(fullPath, ext)
          result.push(...sub)
        } else if (entry.name.endsWith(ext)) {
          result.push(fullPath)
        }
      }
    } catch {
      // directory may not exist
    }
    return result
  }
}
