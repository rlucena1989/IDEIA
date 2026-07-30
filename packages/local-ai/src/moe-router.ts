import { createLogger } from '@ideia/logger'
import { ExpertOffloadManager, LoadBalancer } from './expert-offload'

const log = createLogger('local-ai:moe')

export interface MoEModelInfo {
  id: string
  totalParams: number
  activeParams: number
  numExperts: number
  topK: number
  expertsPerToken: number
  supportedEngines: string[]
}

export interface MoERoutingDecision {
  useMoE: boolean
  modelId: string
  reason: string
  estimatedVRAM: number
  fallbackToDense: boolean
  loadBalanceScore?: number
  suggestedEngine?: string
  expertOffloadConfig?: {
    maxVramSlots: number
    location: 'vram' | 'ram' | 'auto'
  }
}

export type TaskComplexityLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5'

export interface ComplexityRoutingDecision {
  level: TaskComplexityLevel
  modelType: 'dense' | 'moe'
  recommendedModel: string
  maxSteps: number
  tokenBudget: number
  useOffload: boolean
}

export const KNOWN_MOE_MODELS: MoEModelInfo[] = [
  { id: 'Qwen3-Coder-Next', totalParams: 80, activeParams: 3, numExperts: 64, topK: 4, expertsPerToken: 4, supportedEngines: ['vllm'] },
  { id: 'MiniMax-M2.5', totalParams: 229, activeParams: 10, numExperts: 48, topK: 6, expertsPerToken: 6, supportedEngines: ['vllm'] },
  { id: 'DeepSeek-V3.2', totalParams: 685, activeParams: 37, numExperts: 256, topK: 8, expertsPerToken: 8, supportedEngines: ['vllm'] },
  { id: 'Mixtral-8x7B', totalParams: 47, activeParams: 13, numExperts: 8, topK: 2, expertsPerToken: 2, supportedEngines: ['vllm', 'ollama'] },
  { id: 'Qwen3-MoE-A2.7B', totalParams: 30, activeParams: 2.7, numExperts: 32, topK: 4, expertsPerToken: 4, supportedEngines: ['vllm'] },
]

const COMPLEXITY_MAP: Record<TaskComplexityLevel, {
  maxSteps: number; tokenBudget: number; modelType: 'dense' | 'moe'; denseModel: string; moeModel: string
}> = {
  N0: { maxSteps: 1, tokenBudget: 500, modelType: 'dense', denseModel: 'Qwen2.5-7B', moeModel: 'Qwen3-MoE-A2.7B' },
  N1: { maxSteps: 3, tokenBudget: 2000, modelType: 'dense', denseModel: 'Qwen2.5-7B', moeModel: 'Qwen3-MoE-A2.7B' },
  N2: { maxSteps: 5, tokenBudget: 4000, modelType: 'dense', denseModel: 'Qwen2.5-32B', moeModel: 'Mixtral-8x7B' },
  N3: { maxSteps: 10, tokenBudget: 8000, modelType: 'moe', denseModel: 'Qwen2.5-32B', moeModel: 'Mixtral-8x7B' },
  N4: { maxSteps: 15, tokenBudget: 15000, modelType: 'moe', denseModel: 'Qwen2.5-72B', moeModel: 'Qwen3-Coder-Next' },
  N5: { maxSteps: 20, tokenBudget: 25000, modelType: 'moe', denseModel: 'Qwen2.5-72B', moeModel: 'MiniMax-M2.5' },
}

export class MoERouter {
  private models: Map<string, MoEModelInfo> = new Map()
  private offloadManager: ExpertOffloadManager
  private loadBalancer: LoadBalancer

  constructor() {
    for (const m of KNOWN_MOE_MODELS) {
      this.models.set(m.id.toLowerCase(), m)
    }
    this.offloadManager = new ExpertOffloadManager()
    this.loadBalancer = new LoadBalancer()
  }

  registerModel(info: MoEModelInfo): void {
    this.models.set(info.id.toLowerCase(), info)
    log.info('MoE model registered', { id: info.id })
  }

  decide(
    modelQuery: string,
    availableVRAM: number,
    taskComplexity: 'low' | 'medium' | 'high',
  ): MoERoutingDecision {
    const modelId = this.findBestMatch(modelQuery)

    if (!modelId) {
      return {
        useMoE: false,
        modelId: modelQuery,
        reason: `Model ${modelQuery} not found in MoE registry`,
        estimatedVRAM: 0,
        fallbackToDense: true,
      }
    }

    const model = this.models.get(modelId.toLowerCase())
    if (!model) {
      return {
        useMoE: false,
        modelId: modelQuery,
        reason: `Model ${modelQuery} not found in MoE registry`,
        estimatedVRAM: 0,
        fallbackToDense: true,
      }
    }
    const vramNeeded = model.totalParams * 0.5
    const expertSlotsNeeded = Math.min(model.numExperts, 8)
    const engine = model.supportedEngines[0] || 'vllm'

    if (taskComplexity === 'low') {
      return {
        useMoE: false,
        modelId: model.id,
        reason: `Low complexity task — dense model is more efficient for ${model.id}`,
        estimatedVRAM: vramNeeded,
        fallbackToDense: true,
        loadBalanceScore: 0,
        suggestedEngine: engine,
      }
    }

    if (availableVRAM < vramNeeded) {
      if (availableVRAM >= vramNeeded * 0.4) {
        const offloadSlots = Math.max(2, Math.floor((availableVRAM / vramNeeded) * model.numExperts))
        return {
          useMoE: true,
          modelId: model.id,
          reason: `Partial VRAM (${availableVRAM}GB): ${model.numExperts} experts, serving ${offloadSlots} with offload`,
          estimatedVRAM: vramNeeded,
          fallbackToDense: false,
          loadBalanceScore: 0,
          suggestedEngine: engine,
          expertOffloadConfig: {
            maxVramSlots: offloadSlots,
            location: 'ram',
          },
        }
      }
      return {
        useMoE: false,
        modelId: model.id,
        reason: `Insufficient VRAM: need ${vramNeeded.toFixed(0)}GB, have ${availableVRAM}GB`,
        estimatedVRAM: vramNeeded,
        fallbackToDense: true,
        suggestedEngine: engine,
      }
    }

    return {
      useMoE: true,
      modelId: model.id,
      reason: `MoE recommended: ${model.activeParams}B active of ${model.totalParams}B total (${model.numExperts} experts, top-${model.topK})`,
      estimatedVRAM: vramNeeded,
      fallbackToDense: false,
      loadBalanceScore: 0,
      suggestedEngine: engine,
      expertOffloadConfig: {
        maxVramSlots: expertSlotsNeeded,
        location: 'vram',
      },
    }
  }

  decideByComplexity(
    complexityLevel: TaskComplexityLevel,
    availableVRAM: number,
  ): ComplexityRoutingDecision {
    const config = COMPLEXITY_MAP[complexityLevel]

    if (config.modelType === 'dense') {
      return {
        level: complexityLevel,
        modelType: 'dense',
        recommendedModel: config.denseModel,
        maxSteps: config.maxSteps,
        tokenBudget: config.tokenBudget,
        useOffload: false,
      }
    }

    const moeModel = this.models.get(config.moeModel.toLowerCase())
    if (moeModel) {
      const decision = this.decide(config.moeModel, availableVRAM, 'high')
      if (decision.useMoE) {
        return {
          level: complexityLevel,
          modelType: 'moe',
          recommendedModel: config.moeModel,
          maxSteps: config.maxSteps,
          tokenBudget: config.tokenBudget,
          useOffload: decision.expertOffloadConfig?.location === 'ram',
        }
      }
    }

    return {
      level: complexityLevel,
      modelType: 'dense',
      recommendedModel: config.denseModel,
      maxSteps: config.maxSteps,
      tokenBudget: config.tokenBudget,
      useOffload: false,
    }
  }

  getRecommendedForVRAM(vramGB: number): MoEModelInfo[] {
    return KNOWN_MOE_MODELS
      .filter(m => m.totalParams * 0.5 <= vramGB * 0.9)
      .sort((a, b) => b.activeParams - a.activeParams)
  }

  getOffloadManager(): ExpertOffloadManager {
    return this.offloadManager
  }

  getLoadBalancer(): LoadBalancer {
    return this.loadBalancer
  }

  private findBestMatch(query: string): string | null {
    const lower = query.toLowerCase()
    for (const [key] of this.models) {
      if (lower.includes(key)) return key
    }
    return null
  }
}
