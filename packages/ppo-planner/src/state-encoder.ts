export class StateEncoder {
  private readonly _embeddingDim = 128;

  encode(goalDescription: string, features: Record<string, number>): Float32Array {
    const embedding = new Float32Array(this._embeddingDim + 10);
    for (let i = 0; i < Math.min(goalDescription.length, this._embeddingDim); i++) {
      embedding[i] = goalDescription.charCodeAt(i) / 255;
    }
    embedding[128] = this._normalize(features.complexity ?? 0, 0, 1);
    embedding[129] = this._normalize(features.fileCount ?? 0, 0, 1000);
    embedding[130] = this._normalize(features.agentSkillLevel ?? 5, 0, 10);
    embedding[131] = this._normalize(features.similarProjects ?? 0, 0, 50);
    embedding[132] = this._normalize(features.timeEstimate ?? 0, 0, 36000);
    embedding[133] = features.hasExistingCode ? 1 : 0;
    embedding[134] = features.isBugfix ? 1 : 0;
    embedding[135] = features.isRefactor ? 1 : 0;
    embedding[136] = this._normalize(features.historyLength ?? 0, 0, 500);
    embedding[137] = this._normalize(features.stepCount ?? 1, 1, 50);
    return embedding;
  }

  private _normalize(value: number, minVal: number, maxVal: number): number {
    return Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
  }
}
