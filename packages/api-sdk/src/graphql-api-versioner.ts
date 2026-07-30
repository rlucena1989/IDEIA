import { createLogger } from '@ideia/logger'

const log = createLogger('graphql-api-versioner')

export class GraphQLAPIVersioner {
  private _schemas = new Map<string, string>()
  private _currentVersion = '1.0'

  registerSubgraph(name: string, sdl: string): void {
    const old = this._schemas.get(name)
    if (old) {
      const breaking = this._detectBreaking(old, sdl)
      if (breaking > 0) {
        this._currentVersion = (parseInt(this._currentVersion) + 1) + '.0'
        log.info(`Breaking changes detected in ${name}, bumped to v${this._currentVersion}`)
      }
    }
    this._schemas.set(name, sdl)
  }

  getVersion(): string { return this._currentVersion }

  getSchema(name: string): string | undefined { return this._schemas.get(name) }

  listSubgraphs(): string[] { return Array.from(this._schemas.keys()) }

  private _detectBreaking(oldSdl: string, newSdl: string): number {
    let breaking = 0
    const oldTypes = this._parseTypes(oldSdl)
    const newTypes = this._parseTypes(newSdl)

    for (const [name, nt] of newTypes) {
      const ot = oldTypes.get(name)
      if (!ot) continue
      for (const f of nt.fields) {
        const of_ = ot.fields.find(x => x.name === f.name)
        if (!of_) continue
        if (of_.type !== f.type && !f.nullable) breaking++
      }
      for (const of_ of ot.fields) {
        if (!nt.fields.find(f => f.name === of_.name)) breaking++
      }
    }
    return breaking
  }

  private _parseTypes(sdl: string): Map<string, { name: string; fields: Array<{ name: string; type: string; nullable: boolean }> }> {
    const types = new Map<string, { name: string; fields: Array<{ name: string; type: string; nullable: boolean }> }>()
    const re = /type\s+(\w+)\s*\{([^}]+)\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(sdl)) !== null) {
      const fields = m[2].split('\n').filter(Boolean).map(l => {
        const parts = l.trim().split(/:\s*/)
        return {
          name: parts[0]?.split(' ')[0] || '',
          type: parts[1]?.replace(/[!\[\]]/g, '') || 'String',
          nullable: !parts[1]?.includes('!'),
        }
      })
      types.set(m[1], { name: m[1], fields })
    }
    return types
  }
}
