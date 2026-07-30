import * as fsp from 'fs/promises'
import { createLogger } from '@ideia/logger';
import * as path from 'path'
const logger = createLogger('repo-map-generator');

export interface RepoMap {
  root: string
  structure: RepoNode[]
  languages: string[]
  totalFiles: number
  totalDirs: number
  deps: Record<string, string[]>
  generatedAt: string
  tokenEstimate: number
}

export interface RepoNode {
  name: string
  type: 'file' | 'dir'
  path: string
  ext?: string
  size?: number
  children?: RepoNode[]
}

export interface RepoMapOptions {
  maxDepth: number
  excludePatterns: string[]
  includeLanguages: string[]
}

const DEFAULT_OPTIONS: RepoMapOptions = {
  maxDepth: 5,
  excludePatterns: ['node_modules', '.git', 'dist', 'coverage', '.nyc_output', 'target', 'build', '__pycache__'],
  includeLanguages: ['ts', 'js', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'kt', 'swift', 'rb', 'php'],
}

export class RepoMapGenerator {
  private options: RepoMapOptions

  constructor(options?: Partial<RepoMapOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  async generate(projectPath: string): Promise<RepoMap> {
    const root = path.resolve(projectPath)
    const structure = await this.walk(root, root, 0)
    const languages = this.collectLanguages(structure)
    const deps = await this.readDependencies(root)
    const tokenEstimate = this.estimateTokens(structure)

    return {
      root,
      structure,
      languages,
      totalFiles: this.countFiles(structure),
      totalDirs: this.countDirs(structure),
      deps,
      generatedAt: new Date().toISOString(),
      tokenEstimate,
    }
  }

  toMarkdown(map: RepoMap): string {
    const lines: string[] = [
      `# Repo Map: ${map.root}`,
      `Languages: ${map.languages.join(', ')}`,
      `Files: ${map.totalFiles} | Dirs: ${map.totalDirs} | ~${map.tokenEstimate} tokens`,
      '',
      '```',
    ]
    this.renderTree(map.structure, '', lines)
    lines.push('```')
    if (Object.keys(map.deps).length > 0) {
      lines.push('', '### Dependencies')
      for (const [name, deps] of Object.entries(map.deps)) {
        if (deps.length > 0) {
          lines.push(`- ${name}: ${deps.slice(0, 5).join(', ')}${deps.length > 5 ? ` +${deps.length - 5} more` : ''}`)
        }
      }
    }
    return lines.join('\n')
  }

  private async walk(dir: string, root: string, depth: number): Promise<RepoNode[]> {
    if (depth > this.options.maxDepth) return []
    const nodes: RepoNode[] = []
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true })
      for (const entry of entries.sort((a, b) => this.sortEntries(a, b))) {
        if (this.options.excludePatterns.includes(entry.name)) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          const children = await this.walk(fullPath, root, depth + 1)
          if (children.length > 0 || depth < 2) {
            nodes.push({
              name: entry.name + '/',
              type: 'dir',
              path: path.relative(root, fullPath),
              children,
            })
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1)
          if (this.options.includeLanguages.includes(ext)) {
            const stat = await fsp.stat(fullPath)
            nodes.push({
              name: entry.name,
              type: 'file',
              path: path.relative(root, fullPath),
              ext,
              size: stat.size,
            })
          }
        }
      }
    } catch { /* skip unreadable */ }
    return nodes
  }

  private renderTree(nodes: RepoNode[], prefix: string, lines: string[]): void {
    for (const node of nodes) {
      lines.push(`${prefix}${node.type === 'dir' ? '📁' : '📄'} ${node.name}`)
      if (node.children) {
        this.renderTree(node.children, prefix + '  ', lines)
      }
    }
  }

  private collectLanguages(nodes: RepoNode[]): string[] {
    const langs = new Set<string>()
    const walk = (ns: RepoNode[]) => {
      for (const n of ns) {
        if (n.ext) langs.add(n.ext)
        if (n.children) walk(n.children)
      }
    }
    walk(nodes)
    return Array.from(langs).sort()
  }

  private countFiles(nodes: RepoNode[]): number {
    let count = 0
    for (const n of nodes) {
      if (n.type === 'file') count++
      if (n.children) count += this.countFiles(n.children)
    }
    return count
  }

  private countDirs(nodes: RepoNode[]): number {
    let count = 0
    for (const n of nodes) {
      if (n.type === 'dir') {
        count++
        if (n.children) count += this.countDirs(n.children)
      }
    }
    return count
  }

  private estimateTokens(nodes: RepoNode[]): number {
    let count = 0
    for (const n of nodes) {
      if (n.type === 'file') count += 2
      if (n.children) count += this.estimateTokens(n.children)
    }
    return count
  }

  private async readDependencies(root: string): Promise<Record<string, string[]>> {
    const deps: Record<string, string[]> = {}
    try {
      const pkg = JSON.parse(await fsp.readFile(path.join(root, 'package.json'), 'utf-8'))
      if (pkg.dependencies) deps.dependencies = Object.keys(pkg.dependencies)
      if (pkg.devDependencies) deps.devDependencies = Object.keys(pkg.devDependencies)
    } catch { /* no package.json */ }
    try {
      const cargo = await fsp.readFile(path.join(root, 'Cargo.toml'), 'utf-8')
      const deps_match = cargo.match(/\[dependencies\]([\s\S]*?)\[/)
      if (deps_match) deps.rust = deps_match[1].split('\n').filter(l => l.includes('=')).map(l => l.split('=')[0].trim())
    } catch { /* no Cargo.toml */ }
    return deps
  }

  private sortEntries(a: { name: string; isDirectory(): boolean }, b: { name: string; isDirectory(): boolean }): number {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  }
}
