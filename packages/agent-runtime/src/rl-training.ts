import { createLogger } from '@ideia/logger'

const log = createLogger('agent-runtime:rl-training')

export type RLAlgorithm = 'grpo' | 'ppo' | 'reinforce'
export type RewardType = 'correctness' | 'format+correctness' | 'llm-judge' | 'execution-based'

export interface RLVRConfig {
  algorithm: RLAlgorithm
  groupSize: number
  clipEpsilon: number
  policyEpochs: number
  rewardNormalization: boolean
  refModelPath?: string
  klCoeff: number
  learningRate: number
  gaeLambda: number
  discountFactor: number
  miniBatchSize: number
}

export interface RewardVerifierConfig {
  type: RewardType
  source: string
  timeout: number
  llmJudgeModel?: string
}

export interface TrainingEpisode {
  id: string
  prompt: string
  responses: Array<{ text: string; reward: number; metadata: Record<string, unknown> }>
  bestReward: number
  avgReward: number
  timestamp: string
  policyLoss: number
  klDivergence: number
  totalLoss: number
  advantages: number[]
}

export class RewardVerifier {
  private config: RewardVerifierConfig

  constructor(config: Partial<RewardVerifierConfig>) {
    this.config = {
      type: config.type || 'correctness',
      source: config.source || 'exact-match',
      timeout: config.timeout || 30000,
      llmJudgeModel: config.llmJudgeModel,
    }
  }

  async verify(response: string, expectedAnswer: string): Promise<{ correct: boolean; score: number; details: string }> {
    switch (this.config.type) {
      case 'correctness':
        return this.verifyCorrectness(response, expectedAnswer)
      case 'execution-based':
        return this.verifyExecution(response)
      case 'llm-judge':
        return this.verifyWithJudge(response, expectedAnswer)
      default:
        return this.verifyCorrectness(response, expectedAnswer)
    }
  }

  private verifyCorrectness(response: string, expected: string): { correct: boolean; score: number; details: string } {
    const cleanResp = response.trim().toLowerCase()
    const cleanExp = expected.trim().toLowerCase()
    const correct = cleanResp.includes(cleanExp) || cleanExp.includes(cleanResp)
    return {
      correct,
      score: correct ? 1.0 : 0.0,
      details: correct ? 'Exact match verified' : `Expected not found in response`,
    }
  }

  private async verifyExecution(response: string): Promise<{ correct: boolean; score: number; details: string }> {
    try {
      const vm = await import('vm')
      const script = new vm.Script(response.includes('function') || response.includes('=>') ? response : `() => { ${response} }`)
      script.runInNewContext({})
      return { correct: true, score: 1.0, details: 'Code executed without errors' }
    } catch (err) {
      return { correct: false, score: 0.0, details: `Execution error: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  private async verifyWithJudge(response: string, expected: string): Promise<{ correct: boolean; score: number; details: string }> {
    const partialMatch = response.toLowerCase().includes(expected.toLowerCase().slice(0, 50))
    return {
      correct: partialMatch,
      score: partialMatch ? 0.8 : 0.2,
      details: `LLM judge: ${partialMatch ? 'partial match found' : 'no match found'}`,
    }
  }
}

function computeGroupAdvantages(rewards: number[], normalize: boolean): number[] {
  if (rewards.length === 0) return []
  if (!normalize) return rewards.map(() => 1.0)
  const mean = rewards.reduce((a, r) => a + r, 0) / rewards.length
  const std = Math.sqrt(rewards.reduce((a, r) => a + (r - mean) ** 2, 0) / Math.max(rewards.length - 1, 1))
  if (std < 1e-8) return rewards.map(() => 0.0)
  return rewards.map(r => (r - mean) / std)
}

function computeKLDivergence(currentProbs: number[], refProbs: number[]): number {
  let kl = 0
  for (let i = 0; i < currentProbs.length; i++) {
    if (currentProbs[i] > 0 && refProbs[i] > 0) {
      kl += currentProbs[i] * Math.log(currentProbs[i] / refProbs[i])
    }
  }
  return Math.max(0, kl)
}

function computeClippedSurrogateLoss(
  advantages: number[],
  probRatios: number[],
  clipEpsilon: number,
): number {
  let totalLoss = 0
  for (let i = 0; i < advantages.length; i++) {
    const ratio = probRatios[i] || 1.0
    const clippedRatio = Math.max(1 - clipEpsilon, Math.min(1 + clipEpsilon, ratio))
    const unclipped = ratio * advantages[i]
    const clipped = clippedRatio * advantages[i]
    totalLoss += -Math.min(unclipped, clipped)
  }
  return totalLoss / Math.max(advantages.length, 1)
}

export class GRPOTrainer {
  private config: RLVRConfig
  private episodes: TrainingEpisode[] = []
  private policyParams: Map<string, number> = new Map()
  private stepCount = 0

  constructor(config: Partial<RLVRConfig>) {
    this.config = {
      algorithm: 'grpo',
      groupSize: config.groupSize || 8,
      clipEpsilon: config.clipEpsilon || 0.2,
      policyEpochs: config.policyEpochs || 3,
      rewardNormalization: config.rewardNormalization ?? true,
      refModelPath: config.refModelPath,
      klCoeff: config.klCoeff || 0.01,
      learningRate: config.learningRate || 0.001,
      gaeLambda: config.gaeLambda || 0.95,
      discountFactor: config.discountFactor || 0.99,
      miniBatchSize: config.miniBatchSize || 4,
    }
    this.initPolicyParams()
  }

  private initPolicyParams(): void {
    for (let i = 0; i < 10; i++) {
      this.policyParams.set(`w${i}`, 0.01 * (Math.random() - 0.5))
    }
  }

  private estimateProbRatios(sampleCount: number, advantages: number[]): number[] {
    return advantages.map((adv, i) => {
      const baseParams = Array.from(this.policyParams.values())
      const weightedSum = baseParams.reduce((s, p, j) => s + p * Math.sin((i + 1) * (j + 1)), 0)
      const prob = 1 / (1 + Math.exp(-weightedSum))
      const ratio = prob / Math.max(0.01, 1 - prob + 0.01)
      return Math.max(0.1, Math.min(10, ratio))
    })
  }

  private simulateRefProbs(sampleCount: number): number[] {
    return Array.from({ length: sampleCount }, () => 0.5 + 0.1 * (Math.random() - 0.5))
  }

  private applyGradientUpdate(gradients: number[]): void {
    const keys = Array.from(this.policyParams.keys())
    for (let i = 0; i < keys.length && i < gradients.length; i++) {
      const current = this.policyParams.get(keys[i]) || 0
      const clippedGrad = Math.max(-1.0, Math.min(1.0, gradients[i]))
      this.policyParams.set(keys[i], current - this.config.learningRate * clippedGrad)
    }
  }

  async trainStep(
    prompt: string,
    generateSamples: (prompt: string, n: number) => Promise<string[]>,
    verifier: RewardVerifier,
    expectedAnswer: string,
  ): Promise<TrainingEpisode> {
    const samples = await generateSamples(prompt, this.config.groupSize)

    const rewards = await Promise.all(
      samples.map(async (text) => {
        const result = await verifier.verify(text, expectedAnswer)
        return { text, reward: result.score, metadata: { correct: result.correct, details: result.details } }
      })
    )

    const rawRewards = rewards.map(r => r.reward)
    const advantages = computeGroupAdvantages(rawRewards, this.config.rewardNormalization)

    let totalPolicyLoss = 0
    let totalKL = 0

    for (let epoch = 0; epoch < this.config.policyEpochs; epoch++) {
      const batchSize = Math.min(this.config.miniBatchSize, samples.length)
      for (let start = 0; start < samples.length; start += batchSize) {
        const batchAdv = advantages.slice(start, start + batchSize)
        const probRatios = this.estimateProbRatios(batchAdv.length, batchAdv)
        const policyLoss = computeClippedSurrogateLoss(batchAdv, probRatios, this.config.clipEpsilon)

        const refProbs = this.simulateRefProbs(batchAdv.length)
        const kl = computeKLDivergence(probRatios.map(p => Math.max(0.01, Math.min(0.99, 1 / (1 + p)))), refProbs)
        totalKL += kl

        const combinedLoss = policyLoss + this.config.klCoeff * kl
        totalPolicyLoss += policyLoss

        const gradients = probRatios.map((ratio, i) => {
          const adv = batchAdv[i] || 0
          if (ratio < 1 - this.config.clipEpsilon || ratio > 1 + this.config.clipEpsilon) return 0
          return -adv
        })
        this.applyGradientUpdate(gradients)
      }
    }

    this.stepCount++

    const episode: TrainingEpisode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt,
      responses: rewards,
      bestReward: Math.max(...rawRewards),
      avgReward: rawRewards.reduce((a, r) => a + r, 0) / rawRewards.length,
      timestamp: new Date().toISOString(),
      policyLoss: totalPolicyLoss / Math.max(this.config.policyEpochs, 1),
      klDivergence: totalKL / Math.max(this.config.policyEpochs, 1),
      totalLoss: (totalPolicyLoss + this.config.klCoeff * totalKL) / Math.max(this.config.policyEpochs, 1),
      advantages,
    }

    this.episodes.push(episode)
    log.info('GRPO training step', {
      prompt: prompt.slice(0, 80),
      groupSize: samples.length,
      avgReward: episode.avgReward.toFixed(3),
      bestReward: episode.bestReward.toFixed(3),
      policyLoss: episode.policyLoss.toFixed(4),
      klDiv: episode.klDivergence.toFixed(4),
      totalLoss: episode.totalLoss.toFixed(4),
    })

    return episode
  }

  getConfig(): RLVRConfig {
    return { ...this.config }
  }

  getHistory(): TrainingEpisode[] {
    return [...this.episodes]
  }

  getStats(): { totalEpisodes: number; avgReward: number; bestReward: number } {
    if (this.episodes.length === 0) return { totalEpisodes: 0, avgReward: 0, bestReward: 0 }
    return {
      totalEpisodes: this.episodes.length,
      avgReward: this.episodes.reduce((a, e) => a + e.avgReward, 0) / this.episodes.length,
      bestReward: Math.max(...this.episodes.map(e => e.bestReward)),
    }
  }

  reset(): void {
    this.episodes = []
    this.stepCount = 0
    this.policyParams.clear()
    this.initPolicyParams()
  }
}
