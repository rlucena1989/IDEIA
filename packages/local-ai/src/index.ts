export { LocalAiEngine, createLocalAiEngine } from './local-ai';
export { HardwareDetector, createHardwareDetector } from './hardware';
export type { HardwareInfo, GpuDevice } from './types';
export { ModelManager, createModelManager } from './model-manager';
export type { AvailableModel } from './types';
export { LocalInference, createLocalInference } from './inference';
export { VLLMEngine } from './vllm-engine';
export type { VLLMEngineConfig, VLLMStatus } from './vllm-engine';
export { InferenceAutoOptimizer } from './auto-optimizer';
export type { InferenceEngineConfig, OptimizerSuggestion, InferenceEngineType } from './auto-optimizer';
export { MoERouter, KNOWN_MOE_MODELS } from './moe-router';
export type { MoEModelInfo, MoERoutingDecision, TaskComplexityLevel, ComplexityRoutingDecision } from './moe-router';
export { ExpertOffloadManager, LoadBalancer, createExpertOffloadManager, createLoadBalancer } from './expert-offload';
export type { ExpertSlot, ExpertOffloadConfig, OffloadMetrics } from './expert-offload';
export { QuantizationEngine, DEFAULT_CONFIGS } from './quantization-engine';
export type { QuantizationConfig, QuantMethod, QuantizedModelInfo } from './quantization-engine';
export { SpeculativeDecoder } from './speculative-decoding';
export type { SpeculativeDecodingConfig, SpeculativeResult } from './speculative-decoding';
export { SpeculativeConnector } from './speculative-connector';
export type { InferenceBackend } from './speculative-connector';
export type {
  LocalAiConfig,
  LocalModelInfo,
  LocalModelStatus,
  HardwareBackend,
  LocalInferenceConfig,
  LocalInferenceResult,
  LocalEmbeddingConfig,
  LocalEmbeddingResult,
} from './types';
