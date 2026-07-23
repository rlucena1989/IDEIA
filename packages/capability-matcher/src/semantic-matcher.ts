import { SemanticNeed, CapabilityMatch, AgentRecommendation, ContextPackRecommendation, WorkflowRecommendation, SemanticMatchResult } from './semantic-types';
import { KEYWORD_TO_CAPABILITY, COMPLEXITY_TO_CONTEXT_DEPTH } from './rules';
import { calculateConfidence, normalizeKeywords, normalizeStack } from './scoring';
import { SemanticAnalyzer } from './analyzer';
import { AgentRouter } from './agent-router';
import { ContextPackRouter } from './context-router';
import { WorkflowRouter } from './workflow-router';

export class SemanticMatcher {
  private analyzer: SemanticAnalyzer;
  private agentRouter: AgentRouter;
  private contextRouter: ContextPackRouter;
  private workflowRouter: WorkflowRouter;

  constructor() {
    this.analyzer = new SemanticAnalyzer();
    this.agentRouter = new AgentRouter();
    this.contextRouter = new ContextPackRouter();
    this.workflowRouter = new WorkflowRouter();
  }

  analyzeNeed(description: string, teamSize: number = 1): SemanticNeed {
    return this.analyzer.analyze(description, teamSize);
  }

  match(need: SemanticNeed): SemanticMatchResult {
    const capabilities = this.matchCapabilities(need);
    const agents = this.matchAgents(need);
    const contextPacks = this.matchContextPacks(need);
    const workflows = this.matchWorkflows(need);

    const capScores = capabilities.map(c => c.score);
    const agentScores = agents.map(a => a.confidence);
    const workflowScores = workflows.map(w => w.confidence);

    const allScores = [...capScores, ...agentScores, ...workflowScores];
    const overallConfidence = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    const warnings: string[] = [];
    if (need.techStack.length === 0) {
      warnings.push('No technology stack detected in description');
    }
    if (need.complexity === 'complex' && need.teamSize < 2) {
      warnings.push('Complex project with small team may require more resources');
    }
    if (agents.length === 0) {
      warnings.push('No agents could be matched to this need');
    }

    return {
      semanticNeed: need,
      capabilities,
      agents,
      contextPacks,
      workflows,
      overallConfidence: Math.min(Math.max(overallConfidence, 0), 1),
      warnings,
    };
  }

  matchCapabilities(need: SemanticNeed): CapabilityMatch[] {
    const text = `${need.description} ${need.techStack.join(' ')} ${need.domain}`.toLowerCase();
    const matched: CapabilityMatch[] = [];
    const seen = new Set<string>();

    for (const [keyword, capabilityIds] of Object.entries(KEYWORD_TO_CAPABILITY)) {
      if (!text.includes(keyword)) continue;

      for (const capId of capabilityIds) {
        if (seen.has(capId)) continue;
        seen.add(capId);

        const keywordScore = 1;
        const domainScore = need.domain === 'web' || need.domain === 'api' ? 1 : 0.5;
        const complexityScore = need.complexity === 'complex' ? 0.8 : need.complexity === 'moderate' ? 1 : 0.7;
        const stackScore = need.techStack.length > 0 ? 0.8 : 0.3;

        const score = calculateConfidence({
          keywordMatch: keywordScore,
          domainFit: domainScore,
          complexityFit: complexityScore,
          stackFit: stackScore,
        });

        matched.push({
          capabilityId: capId,
          score,
          reasoning: `Matched by keyword "${keyword}" in ${need.domain} context`,
        });
      }
    }

    matched.sort((a, b) => b.score - a.score);
    return matched;
  }

  matchAgents(need: SemanticNeed): AgentRecommendation[] {
    return this.agentRouter.route(need);
  }

  matchContextPacks(need: SemanticNeed): ContextPackRecommendation[] {
    return this.contextRouter.recommend(need);
  }

  matchWorkflows(need: SemanticNeed): WorkflowRecommendation[] {
    return this.workflowRouter.recommend(need);
  }

  getAgentForTask(description: string): AgentRecommendation {
    const need = this.analyzer.analyze(description);
    const agents = this.agentRouter.route(need);
    return agents[0] || {
      agentId: 'Programmer',
      confidence: 0.5,
      reason: 'Default fallback agent',
      suggestedMode: 'N1',
    };
  }

  getContextForTask(description: string): ContextPackRecommendation[] {
    const need = this.analyzer.analyze(description);
    return this.contextRouter.recommend(need);
  }

  getWorkflowForTask(description: string): WorkflowRecommendation {
    const need = this.analyzer.analyze(description);
    const workflows = this.workflowRouter.recommend(need);
    return workflows[0] || {
      workflowId: 'zero-to-deploy',
      confidence: 0.5,
      phases: ['analyze', 'design', 'implement', 'test', 'deploy'],
    };
  }

  suggestPipeline(description: string): { agents: AgentRecommendation[]; packs: ContextPackRecommendation[]; workflow: WorkflowRecommendation } {
    const need = this.analyzer.analyze(description);
    return {
      agents: this.agentRouter.route(need),
      packs: this.contextRouter.recommend(need),
      workflow: (this.workflowRouter.recommend(need))[0] || {
        workflowId: 'zero-to-deploy',
        confidence: 0.5,
        phases: ['analyze', 'design', 'implement', 'test', 'deploy'],
      },
    };
  }
}
