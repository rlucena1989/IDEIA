export type LocalModelStatus = 'not_downloaded' | 'downloading' | 'ready' | 'error';
export type HardwareBackend = 'cpu' | 'cuda' | 'rocm' | 'mps' | 'auto';
export type ModelFormat = 'gguf' | 'onnx' | 'safetensors';
export type InferenceEngine = 'vllm' | 'ollama' | 'llamacpp' | 'tensorrt-llm' | 'sglang';

export interface LocalModelInfo {
  name: string;
  size: string;
  format: ModelFormat;
  status: LocalModelStatus;
  downloadProgress?: number;
  quantizations?: string[];
  contextLength: number;
  lastUsed?: number;
  benchmark?: ModelBenchmark;
}

export interface ModelBenchmark {
  ttft: number;
  tokensPerSecond: number;
  totalDuration: number;
  memoryUsageMb: number;
  testedAt: number;
}

export interface HardwareInfo {
  platform: string;
  cpuCores: number;
  cpuModel: string;
  totalMemoryGb: number;
  freeMemoryGb: number;
  hasCuda: boolean;
  hasRocm: boolean;
  hasMps: boolean;
  gpuDevices: GpuDevice[];
  recommendedBackend: HardwareBackend;
  recommendedMaxModelSize: string;
}

export interface GpuDevice {
  name: string;
  memoryGb: number;
  computeCapability?: string;
}

export interface LocalInferenceConfig {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  stop?: string[];
  systemPrompt?: string;
}

export interface LocalInferenceResult {
  text: string;
  model: string;
  tokensPerSecond: number;
  totalTokens: number;
  ttft: number;
  finished: boolean;
}

export interface LocalEmbeddingConfig {
  model: string;
  input: string | string[];
}

export interface LocalEmbeddingResult {
  embeddings: number[][];
  model: string;
  dimension: number;
  duration: number;
}

export interface LocalAiConfig {
  ollamaEndpoint?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  hardwareBackend?: HardwareBackend;
  modelDir?: string;
  maxMemoryGb?: number;
  fallbackToCloud?: boolean;
}

export interface AvailableModel {
  name: string;
  size: string;
  description: string;
  quantization?: string;
  recommended: boolean;
}
