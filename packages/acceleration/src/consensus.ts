import { ConsensusResult, ProviderKind } from './types';
import { createLogger } from '@ideia/logger';
import { LLMAdapter, MOCK_ADAPTER } from './llm-adapter';
import { OPENAI_ADAPTER, ANTHROPIC_ADAPTER, GOOGLE_ADAPTER } from './remote-model-adapter';
import { OLLAMA_ADAPTER, LOCAL_MOCK_ADAPTER } from './local-model-adapter';
const logger = createLogger('consensus');

type Vote = {
  provider: ProviderKind;
  decision: string;
  confidence: number;
};

export async function reachConsensus(
  question: string,
  providers: { adapter: LLMAdapter; weight: number }[],
  minParticipants = 2
): Promise<ConsensusResult> {
  const votes: Vote[] = [];

  for (const { adapter, weight } of providers) {
    if (!adapter.isAvailable()) continue;
    try {
      const resp = await adapter.send({ model: 'default', prompt: question, maxTokens: 500, temperature: 0.3, stream: false });
      if (resp.success) {
        votes.push({ provider: adapter.provider, decision: resp.content.slice(0, 200), confidence: weight });
      }
    } catch {
      // skip failed provider
    }
  }

  if (votes.length < minParticipants) {
    return { decision: 'insufficient participants', confidence: 0, participants: votes.length, agreements: 0, disagreements: 0, details: votes.map(v => `${v.provider}: ${v.decision}`) };
  }

  const avgConfidence = votes.reduce((a, v) => a + v.confidence, 0) / votes.length;
  const agreement = avgConfidence > 0.5 ? votes.length : Math.floor(votes.length / 2);

  return {
    decision: votes.sort((a, b) => b.confidence - a.confidence)[0].decision,
    confidence: Math.round(avgConfidence * 100) / 100,
    participants: votes.length,
    agreements: agreement,
    disagreements: votes.length - agreement,
    details: votes.map(v => `${v.provider}: ${v.decision.slice(0, 100)} (${v.confidence})`)
  };
}

export function createConsensusGroup(providers: ProviderKind[]): { adapter: LLMAdapter; weight: number }[] {
  const map: Record<ProviderKind, LLMAdapter> = {
    openai: OPENAI_ADAPTER,
    anthropic: ANTHROPIC_ADAPTER,
    google: GOOGLE_ADAPTER,
    local: LOCAL_MOCK_ADAPTER,
    ollama: OLLAMA_ADAPTER,
    mock: MOCK_ADAPTER
  };
  return providers.filter(p => map[p]).map(p => ({ adapter: map[p], weight: 1 }));
}

export async function mockConsensus(question: string): Promise<ConsensusResult> {
  const group = createConsensusGroup(['mock', 'mock']);
  return reachConsensus(question, group, 1);
}
