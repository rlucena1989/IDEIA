import { createLogger } from '@ideia/logger'

const log = createLogger('local-ai:speculative-decoding')

export interface SpeculativeDecodingConfig {
  draftModel: string
  targetModel: string
  numSpeculativeTokens: number
  acceptanceThreshold: number
  maxRetries: number
}

export interface SpeculativeResult {
  text: string
  acceptedTokens: number
  proposedTokens: number
  acceptanceRate: number
  speedup: number
  draftCalls: number
  targetCalls: number
}

export class SpeculativeDecoder {
  private config: SpeculativeDecodingConfig
  private stats = {
    accepted: 0,
    proposed: 0,
    draftCalls: 0,
    targetCalls: 0,
  }

  constructor(config: Partial<SpeculativeDecodingConfig>) {
    this.config = {
      draftModel: config.draftModel || 'Qwen2.5-0.5B',
      targetModel: config.targetModel || '',
      numSpeculativeTokens: config.numSpeculativeTokens || 5,
      acceptanceThreshold: config.acceptanceThreshold ?? 0.9,
      maxRetries: config.maxRetries || 3,
    }
  }

  async generate(
    prompt: string,
    draftGenerate: (prompt: string, maxTokens: number) => Promise<string>,
    targetVerify: (prompt: string, candidates: string[]) => Promise<boolean[]>,
    maxTokens: number = 1024,
  ): Promise<SpeculativeResult> {
    let remaining = maxTokens
    let output = ''
    let totalAccepted = 0
    let totalProposed = 0

    while (remaining > 0) {
      const numTokens = Math.min(this.config.numSpeculativeTokens, remaining)

      this.stats.draftCalls++
      const draftOutput = await draftGenerate(prompt + output, numTokens)
      const proposed = draftOutput.trim().split(/\s+/).slice(0, numTokens)
      totalProposed += proposed.length

      if (proposed.length === 0) break

      this.stats.targetCalls++
      const acceptance = await targetVerify(prompt + output, proposed)

      let accepted = 0
      for (let i = 0; i < proposed.length; i++) {
        if (acceptance[i] !== false) {
          output += (output ? ' ' : '') + proposed[i]
          accepted++
          this.stats.accepted++
          remaining--
        } else {
          break
        }
      }
      totalAccepted += accepted

      const acceptanceRate = accepted / Math.max(1, proposed.length)
      if (acceptanceRate < this.config.acceptanceThreshold && accepted === 0) {
        remaining--
      }
    }

    const totalDraft = this.stats.draftCalls
    const totalTarget = this.stats.targetCalls
    const theoreticalTokens = maxTokens - remaining + output.split(/\s+/).length
    const actualCalls = totalTarget + totalDraft
    const speedup = actualCalls > 0 ? theoreticalTokens / actualCalls : 1

    return {
      text: output,
      acceptedTokens: totalAccepted,
      proposedTokens: totalProposed,
      acceptanceRate: totalProposed > 0 ? totalAccepted / totalProposed : 0,
      speedup: Math.round(speedup * 100) / 100,
      draftCalls: totalDraft,
      targetCalls: totalTarget,
    }
  }

  getStats(): { accepted: number; proposed: number; draftCalls: number; targetCalls: number; overallAcceptanceRate: number } {
    return {
      ...this.stats,
      overallAcceptanceRate: this.stats.proposed > 0 ? this.stats.accepted / this.stats.proposed : 0,
    }
  }

  resetStats(): void {
    this.stats = { accepted: 0, proposed: 0, draftCalls: 0, targetCalls: 0 }
  }
}
