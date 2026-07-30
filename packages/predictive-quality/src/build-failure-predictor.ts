export interface ChangeSet {
  files: string[];
  authors: string[];
  isWeekend: boolean;
  nightCommit: boolean;
  docsOnly: boolean;
  testChanges: number;
  avgFileComplexity: number;
  hasDependencyChange: boolean;
  lastBuildSuccessRate: number;
  hour: number;
}

export interface Prediction {
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
  topFactors: Array<{ feature: string; impact: number }>;
  recommendedAction: string;
}

export interface TrainingExample { changes: ChangeSet; buildFailed: boolean }
export interface TrainingMetrics { accuracy: number; featureImportance: Array<{ name: string; importance: number }> }

export class BuildFailurePredictor {
  private weights: number[] = [];

  async predict(changes: ChangeSet): Promise<Prediction> {
    const features = this.extractFeatures(changes);
    const probability = this.weights.length > 0
      ? this.sigmoid(features.reduce((s, f, i) => s + f * (this.weights[i] ?? 0), 0))
      : this.fallbackHeuristic(changes);

    return {
      probability,
      riskLevel: probability > 0.7 ? 'high' : probability > 0.4 ? 'medium' : 'low',
      topFactors: this.getTopFactors(changes).slice(0, 3),
      recommendedAction: probability > 0.7 ? 'run_full_test_suite' : probability > 0.4 ? 'run_smoke_tests' : 'skip_heavy_tests',
    };
  }

  async train(trainingData: TrainingExample[]): Promise<TrainingMetrics> {
    const features = trainingData.map(ex => this.extractFeatures(ex.changes));
    const labels = trainingData.map(ex => ex.buildFailed ? 1 : 0);
    const n = features[0]?.length ?? 0;

    this.weights = new Array(n).fill(0);
    const lr = 0.01;
    for (let epoch = 0; epoch < 100; epoch++) {
      for (let i = 0; i < features.length; i++) {
        const pred = this.sigmoid(features[i].reduce((s, f, j) => s + f * this.weights[j], 0));
        const error = pred - labels[i];
        for (let j = 0; j < n; j++) {
          this.weights[j] -= lr * error * features[i][j];
        }
      }
    }

    const predictions = features.map(f => this.sigmoid(f.reduce((s, v, j) => s + v * this.weights[j], 0)));
    const accuracy = predictions.reduce((acc, p, i) => acc + (Math.round(p) === labels[i] ? 1 : 0), 0) / predictions.length;

    return {
      accuracy,
      featureImportance: this.getFeatureNames().map((name, i) => ({ name, importance: Math.abs(this.weights[i] ?? 0) })),
    };
  }

  private extractFeatures(changes: ChangeSet): number[] {
    return [
      changes.files.length,
      changes.authors.length,
      changes.isWeekend ? 1 : 0,
      changes.nightCommit ? 1 : 0,
      changes.docsOnly ? 1 : 0,
      changes.testChanges / Math.max(changes.files.length, 1),
      changes.avgFileComplexity,
      changes.hasDependencyChange ? 1 : 0,
      changes.lastBuildSuccessRate,
      changes.hour / 24,
    ];
  }

  private fallbackHeuristic(changes: ChangeSet): number {
    let risk = 0.1;
    if (changes.files.length > 10) risk += 0.2;
    if (changes.hasDependencyChange) risk += 0.3;
    if (changes.isWeekend) risk += 0.1;
    if (changes.nightCommit) risk += 0.1;
    if (changes.lastBuildSuccessRate < 0.5) risk += 0.2;
    return Math.min(risk, 0.95);
  }

  private getTopFactors(changes: ChangeSet): Array<{ feature: string; impact: number }> {
    return [
      { feature: 'files', impact: Math.min(changes.files.length / 20, 1) },
      { feature: 'hasDependencyChange', impact: changes.hasDependencyChange ? 0.8 : 0 },
      { feature: 'lastBuildSuccessRate', impact: 1 - changes.lastBuildSuccessRate },
    ];
  }

  private sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }

  private getFeatureNames(): string[] {
    return ['numFiles', 'numAuthors', 'isWeekend', 'nightCommit', 'docsOnly', 'testRatio', 'complexity', 'depChange', 'lastSuccessRate', 'hour'];
  }
}
