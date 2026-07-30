export type QuantMethod = 'awq' | 'gptq' | 'gguf' | 'fp8' | 'nf4'
export type BackendType = 'auto-gptq' | 'auto-awq' | 'llama-cpp' | 'vllm' | 'bitsandbytes-nf4'

export interface QuantizationConfig {
  method: QuantMethod
  bits: 4 | 8
  groupSize: number
  dataset: string
  dampPercent: number
  descAct: boolean
  sym: boolean
  trueSequential: boolean
}

export interface QuantizedModelInfo {
  originalPath: string
  outputPath: string
  method: QuantMethod
  bits: number
  originalSizeBytes: number
  compressedSizeBytes: number
  compressionRatio: number
  qualityScore: number
  quantizationTimeMs: number
  calibrated: boolean
  backend: BackendType
}

export interface BackendCapability {
  backend: BackendType
  supportedMethods: QuantMethod[]
  requiresGpu: boolean
  requiresPython: boolean
  minVRAMGb: number
  available: boolean
}

export interface HardwareProfile {
  platform: string
  cpuCores: number
  totalMemoryGb: number
  freeMemoryGb: number
  hasCuda: boolean
  hasRocm: boolean
  hasMps: boolean
  cudaVersion?: string
  gpuDevices: GPUDeviceInfo[]
}

export interface GPUDeviceInfo {
  name: string
  memoryGb: number
  computeCapability?: string
  index: number
}

export interface QuantizationJob {
  id: string
  modelPath: string
  outputDir: string
  method: QuantMethod
  config: QuantizationConfig
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  result?: QuantizedModelInfo
  error?: string
  startedAt?: number
  completedAt?: number
}

export interface CalibrationDataset {
  name: string
  path: string
  samples: number
  type: 'text' | 'code' | 'project'
  description: string
}

export interface QuantizationBenchmarkResult {
  method: QuantMethod
  backend: BackendType
  modelSizeGb: number
  compressedSizeGb: number
  compressionRatio: number
  qualityScore: number
  quantizationTimeMs: number
  tokensPerSecond: number
  vramUsageGb: number
  perplexity: number
}
