export interface HandoffPayload {
  taskId: string
  from: string
  to: string
  phase: 'scout' | 'guard' | 'orchestrator' | 'build' | 'check' | 'g0-triage' | 'g1-study' | 'g2-dor' | 'g3-spec' | 'g4-review' | 'g5-plan' | 'g6-build' | 'g7-validate' | 'g8-deliver' | 'g9-distill'
  input: {
    spec: string
    context: Record<string, unknown>
    constraints: string[]
  }
  output?: {
    result: unknown
    artifacts: string[]
    confidence: number
    issues: string[]
  }
  metadata: {
    createdAt: string
    completedAt?: string
    durationMs?: number
    modelUsed?: string
    tokenCost?: number
  }
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
}

export interface HandoffChain {
  rootTaskId: string
  handoffs: HandoffPayload[]
  finalVerdict?: {
    passed: boolean
    summary: string
    artifacts: string[]
  }
}

export class HandoffFileManager {
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
  }

  async save(payload: HandoffPayload): Promise<string> {
    const fileno = `${payload.phase}-${payload.taskId}-${Date.now()}.handoff.json`
    const filePath = `${this.basePath}/${fileno}`
    const fs = await import('fs/promises')
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return fileno
  }

  async load(filename: string): Promise<HandoffPayload> {
    const fs = await import('fs/promises')
    const content = await fs.readFile(`${this.basePath}/${filename}`, 'utf-8')
    return JSON.parse(content) as HandoffPayload
  }

  async getChain(taskId: string): Promise<HandoffChain> {
    const fs = await import('fs/promises')
    const files = await fs.readdir(this.basePath)
    const handoffs: HandoffPayload[] = []

    for (const file of files) {
      if (file.endsWith('.handoff.json') && file.includes(taskId)) {
        const content = await fs.readFile(`${this.basePath}/${file}`, 'utf-8')
        handoffs.push(JSON.parse(content))
      }
    }

    handoffs.sort((a, b) => (a.metadata.createdAt < b.metadata.createdAt ? -1 : 1))

    const finalHandoff = handoffs.find(h => h.phase === 'check' && h.status === 'completed')
    return {
      rootTaskId: taskId,
      handoffs,
      finalVerdict: finalHandoff ? {
        passed: finalHandoff.status === 'completed',
        summary: JSON.stringify(finalHandoff.output),
        artifacts: finalHandoff.output?.artifacts || [],
      } : undefined,
    }
  }
}
