export * from './agent-runtime';
export * from './agent-orchestrator';
export * from './step-executor';
export * from './policy-integration';

export * from './langgraph-graph';
export * from './edges';
export * from './parallel';
export * from './checkpoint';
export * from './nodes';
export * from './subgraphs';
export * from './yaml-agents';

export { AgentRegistry, createAgentRegistry } from './agent-registry';
export type { AgentRegistration } from './agent-registry';
export { AgentCoordinator, createAgentCoordinator } from './agent-coordinator';
export type { CoordinationState } from './agent-coordinator';

export { PlannerExecutorPipeline, createPlannerExecutorPipeline } from './planner-executor';
export type { Plan, PlannedStep, PlannerExecutorConfig } from './planner-executor';

export { HandoffFileManager } from './handoff-file';
export type { HandoffPayload, HandoffChain } from './handoff-file';
export { MakerVerifierLoop } from './maker-verifier';
export type { MakerVerifierConfig, MakerVerifierResult, MakerConfig, VerifierConfig } from './maker-verifier';
export { SpecDrivenPipeline } from './spec-pipeline';
export type { SpecPipelineInput, SpecPipelineResult, SpecTask } from './spec-pipeline';
export { WorktreeIsolation } from './worktree-isolation';
export type { WorktreeSession } from './worktree-isolation';
export { HumanGatePipeline } from './human-gate-pipeline';
export type { PipelineGatePoint, PipelineGateState } from './human-gate-pipeline';
export { ROLE_CONFIGS } from './subagent-roles';
export type { SubagentRole, SubagentRoleConfig, SubagentPipelineConfig } from './subagent-roles';
export { DEFAULT_PIPELINE_CONFIG } from './subagent-roles';
export { RewardVerifier, GRPOTrainer } from './rl-training';
export type { RLVRConfig, RewardVerifierConfig, TrainingEpisode, RLAlgorithm, RewardType } from './rl-training';
export { AgenticEnvironment, CreditAssigner } from './rl-agentic-env';
export type { AgenticStep, AgenticEpisode, CreditAssignment } from './rl-agentic-env';

export { AgentSpawner } from './agent-spawning';
export { ScalingEngine } from './scaling-engine';
export { PoolManager } from './pool-manager';
export { AgentLifecycleController } from './agent-lifecycle-controller';
export type {
  PoolType, AgentLifecycleState, ScalingStrategy,
  PoolSizingRule, ScalingDecision, PoolStats, ReactiveMetrics,
  SpawnedAgent, ScheduledEvent, PoolHealth,
} from './types-scaling';
export { DEFAULT_POOL_RULES } from './types-scaling';

// AgentGraph legado — disponível via import específico
// import { AgentGraph } from '@ideia/agent-runtime/agent-graph';
