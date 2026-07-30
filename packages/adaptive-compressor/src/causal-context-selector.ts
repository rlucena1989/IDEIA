export class CausalContextSelector {
  private _taskDAG: Map<string, string[]> = new Map();
  private _interventionHistory: Map<string, Map<string, number[]>> = new Map();

  constructor() {
    this._taskDAG.set('code', ['function_signatures', 'imports', 'types', 'variable_names']);
    this._taskDAG.set('conversation', ['user_intent', 'key_entities', 'action_items']);
    this._taskDAG.set('documentation', ['api_names', 'parameters', 'return_values', 'examples']);
    this._taskDAG.set('analysis', ['metrics', 'thresholds', 'comparisons', 'trends']);
  }

  async scoreContext(
    context: string, taskType: string, query?: string,
  ): Promise<Array<{ token: string; position: number; causalRelevance: number; isCausal: boolean }>> {
    const tokens = context.split(/\s+/);
    const relevantConcepts = this._taskDAG.get(taskType) ?? [];

    return tokens.map((token, i) => {
      let score = 0.3;
      if (query) {
        const qWords = query.toLowerCase().split(/\s+/);
        score += qWords.filter(qw => token.toLowerCase().includes(qw)).length / Math.max(1, qWords.length) * 0.5;
      }
      if (/[A-Z]/.test(token[0]) && token.length > 2) score += 0.3;
      if (relevantConcepts.some(c => token.toLowerCase().includes(c))) score += 0.4;
      if (['the','a','an','in','on','at'].includes(token.toLowerCase())) score -= 0.5;

      return {
        token,
        position: i,
        causalRelevance: Math.max(0, Math.min(1, score)),
        isCausal: score > 0.5,
      };
    });
  }

  async selectCausalContext(
    context: string, taskType: string, targetRatio: number, query?: string,
  ): Promise<string> {
    const scores = await this.scoreContext(context, taskType, query);
    const targetTokens = Math.max(1, Math.floor(scores.length * targetRatio));

    const hasEnoughCausal = scores.filter(s => s.isCausal).length >= targetTokens;
    const selected = hasEnoughCausal
      ? scores.filter(s => s.isCausal)
      : [...scores].sort((a, b) => b.causalRelevance - a.causalRelevance);

    return selected
      .slice(0, targetTokens)
      .sort((a, b) => a.position - b.position)
      .map(s => s.token)
      .join(' ');
  }

  recordIntervention(contextType: string, token: string, outcomeScore: number): void {
    if (!this._interventionHistory.has(contextType)) {
      this._interventionHistory.set(contextType, new Map());
    }
    const typeHistory = this._interventionHistory.get(contextType)!;
    if (!typeHistory.has(token)) typeHistory.set(token, []);
    typeHistory.get(token)!.push(outcomeScore);
  }

  estimateATE(token: string, contextType: string): number {
    const history = this._interventionHistory.get(contextType)?.get(token);
    if (!history || history.length < 2) return 0;
    const mid = Math.floor(history.length / 2);
    const meanT = history.slice(mid).reduce((s, v) => s + v, 0) / Math.max(1, history.length - mid);
    const meanC = history.slice(0, mid).reduce((s, v) => s + v, 0) / Math.max(1, mid);
    return meanT - meanC;
  }
}
