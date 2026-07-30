export class NeuralGuidedSearch {
  private _patternScores = new Map<string, number>()
  private _learningRate = 0.05

  constructor() {}

  learnPattern(state: Record<string, unknown>, action: string, reward: number): void {
    const key = this._generateKey(state, action)
    const currentScore = this._patternScores.get(key) || 0
    const updatedScore = currentScore + this._learningRate * (reward - currentScore)
    this._patternScores.set(key, Math.max(-1, Math.min(1, updatedScore)))
  }

  predict(state: Record<string, unknown>, actions: string[]): Array<{ action: string; score: number }> {
    return actions.map(action => {
      const key = this._generateKey(state, action)
      const score = this._patternScores.get(key) || 0
      return { action, score }
    }).sort((a, b) => b.score - a.score)
  }

  selectBestAction(state: Record<string, unknown>, actions: string[]): string | null {
    const scored = this.predict(state, actions)
    return scored.length > 0 ? scored[0].action : null
  }

  batchLearn(experiences: Array<{ state: Record<string, unknown>; action: string; reward: number }>): void {
    for (const exp of experiences) {
      this.learnPattern(exp.state, exp.action, exp.reward)
    }
  }

  getLearnedPatterns(): number {
    return this._patternScores.size
  }

  clear(): void {
    this._patternScores.clear()
  }

  private _generateKey(state: Record<string, unknown>, action: string): string {
    const relevant = ['taskType', 'complexity', 'filesAffected', 'riskLevel']
    const parts = relevant.map(k => `${k}=${String(state[k] ?? 'unknown')}`)
    return `${parts.join('|')}|action=${action}`
  }
}
