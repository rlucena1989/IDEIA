import { createLogger } from '@ideia/logger'
import { FileDialogOptions, DialogResult, FilePreview } from './types'

const logger = createLogger('dialog-service')

export class FileDialogService {
  async open(options: FileDialogOptions): Promise<DialogResult> {
    logger.info(`Open dialog`, { type: options.type, filters: options.filters.map(f => f.name) })
    if (options.type === 'folder') return { canceled: false, files: ['/home/user/project'] }
    if (options.multiSelect) return { canceled: false, files: ['/home/user/file1.ts', '/home/user/file2.ts'] }
    return { canceled: false, files: ['/home/user/file.ts'] }
  }

  async save(defaultPath?: string): Promise<DialogResult> {
    logger.info(`Save dialog`, { defaultPath })
    return { canceled: false, files: [defaultPath || '/home/user/newfile.ts'], filePath: defaultPath || '/home/user/newfile.ts' }
  }

  getPreview(path: string): FilePreview {
    return { path, name: path.split(/[/\\]/).pop() || '', size: 1024, type: path.endsWith('.ts') ? 'typescript' : 'text', lastModified: new Date().toISOString() }
  }
}
