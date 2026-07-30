import { createProviderFromEnv, ProviderRouter, OllamaProvider } from '@ideia/llm-provider';
import { createLogger } from '@ideia/logger';
import type { LLMProvider, ChatResponse } from '@ideia/llm-provider';
import type { Scenario, SimulateOutput, SimConfig } from './types';
import { simulateOutcomes } from './simulate';
const logger = createLogger('llm-enrichment');

export interface LlmEnrichmentConfig {
  llmProvider?: LLMProvider;
  fallbackToHeuristic?: boolean;
}

export class LlmEnrichment {
  private provider: LLMProvider;
  private fallbackToHeuristic: boolean;
  private router: ProviderRouter;

  constructor(config?: LlmEnrichmentConfig) {
    this.provider = config?.llmProvider ?? this.createDefaultProvider();
    this.fallbackToHeuristic = config?.fallbackToHeuristic ?? true;
    this.router = new ProviderRouter();
    this.router.register(this.provider);
  }

  getProvider(): LLMProvider {
    return this.provider;
  }

  getRouter(): ProviderRouter {
    return this.router;
  }

  private createDefaultProvider(): LLMProvider {
    try {
      return createProviderFromEnv();
    } catch {
      return new OllamaProvider({ endpoint: 'http://127.0.0.1:11434', defaultModel: 'phi-4-mini' });
    }
  }

  async enrichSimulation(scenario: Scenario, config?: SimConfig): Promise<SimulateOutput> {
    const heuristicResult = simulateOutcomes(scenario, config);

    try {
      const llmResult = await this.llmSuggest(scenario, heuristicResult);
      return this.mergeResults(heuristicResult, llmResult);
    } catch {
      if (this.fallbackToHeuristic) {
        return heuristicResult;
      }
      throw new Error('LLM enrichment unavailable and fallback disabled');
    }
  }

  private async llmSuggest(scenario: Scenario, current: SimulateOutput): Promise<string[]> {
    const input = JSON.stringify({
      scenario: scenario.name,
      variables: scenario.variables,
      currentOutcomes: current.outcomes.slice(0, 3),
      recommendations: current.recommendations,
    });

    const response = await this.provider.chat({
      model: '',
      messages: [
        { role: 'system', content: 'You are a simulation enrichment assistant. Given a scenario and current simulation results, suggest additional recommendations. Respond JSON: {"suggestions":["..."]}' },
        { role: 'user', content: input.slice(0, 4000) },
      ],
      temperature: 0.3,
      maxTokens: 512,
    });

    const chatResponse = response as ChatResponse;
    const content = chatResponse.content;
    let parsed: { suggestions?: string[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }
    return parsed.suggestions ?? [];
  }

  private mergeResults(heuristic: SimulateOutput, llmSuggestions: string[]): SimulateOutput {
    const merged: SimulateOutput = {
      outcomes: heuristic.outcomes,
      confidence: Math.min(heuristic.confidence + 0.1, 1),
      recommendations: [
        ...heuristic.recommendations,
        ...llmSuggestions.filter(s => !heuristic.recommendations.includes(s)),
      ],
    };
    return merged;
  }
}
