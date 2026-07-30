import { DistillationReport } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('distilled-cross-encoder');

export class DistilledCrossEncoder {
  private _teacherCache = new Map<string, number>();
  private _studentWeights: number[] = [0.3, 0.5, 0.2];

  async distill(queries: string[], docs: string[], teacherScores: number[]): Promise<DistillationReport> {
    const studentScores = queries.map((q, i) => this._studentPredict(q, docs[i]));
    const mse = studentScores.reduce((s, score, i) => s + Math.pow(score - teacherScores[i], 2), 0) / queries.length;
    const kld = this._klDivergence(studentScores, teacherScores);
    const accuracy = studentScores.filter((s, i) => Math.abs(s - teacherScores[i]) < 0.1).length / queries.length;

    const lr = 0.01;
    for (let i = 0; i < this._studentWeights.length; i++) {
      const grad = studentScores.reduce((g, _s, j) => {
        return g + 2 * (studentScores[j] - teacherScores[j]) * (j === i ? 1 : 0);
      }, 0) / queries.length;
      this._studentWeights[i] -= lr * grad;
    }

    return {
      mse, kld, accuracy,
      studentWeights: [...this._studentWeights],
      compressionRatio: 10,
      distillationLoss: mse + kld * 0.5,
    };
  }

  async predictStudent(query: string, doc: string): Promise<number> {
    return this._studentPredict(query, doc);
  }

  getStudentWeights(): number[] {
    return [...this._studentWeights];
  }

  private _studentPredict(query: string, doc: string): number {
    const overlap = query.split(/\s+/).filter(t => doc.includes(t)).length / query.split(/\s+/).length;
    const lenSim = Math.min(query.length, doc.length) / Math.max(query.length, doc.length);
    const posScore = doc.toLowerCase().includes(query.toLowerCase().substring(0, 5)) ? 1 : 0;
    const features = [overlap, lenSim, posScore];
    return features.reduce((s, f, i) => s + f * (this._studentWeights[i] ?? 0), 0);
  }

  private _klDivergence(p: number[], q: number[]): number {
    return p.reduce((s, pi, i) => s + pi * Math.log((pi + 1e-10) / (q[i] + 1e-10)), 0);
  }
}
