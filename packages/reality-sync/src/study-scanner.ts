import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import { StudyIntensifier } from './study-intensifier';

export interface StudyScore {
  name: string;
  filePath: string;
  score: number;
  previousScore: number;
  missingSections: string[];
  lastScanned: number;
}

export interface MonitoringEntry {
  timestamp: number;
  averageScore: number;
  totalStudies: number;
  degraded: StudyScore[];
  improved: StudyScore[];
}

export class StudyScanner extends EventEmitter {
  private workspaceRoot: string;
  private estudosDir: string;
  private studyIntensifier: StudyIntensifier;
  private monitoringHistory: MonitoringEntry[] = [];
  private previousScores: Map<string, number> = new Map();
  private monitoringTimer: ReturnType<typeof setInterval> | null = null;
  private verbose: boolean;

  constructor(root: string, verbose = false) {
    super();
    this.workspaceRoot = root;
    this.verbose = verbose;
    this.estudosDir = this.findEstudosDir(root);
    this.studyIntensifier = new StudyIntensifier(root, verbose);
  }

  private log(msg: string): void {
    if (this.verbose) console.log(`[StudyScanner] ${msg}`);
  }

  private findEstudosDir(root: string): string {
    const candidates = [
      path.join(root, 'docs', 'ESTUDOS'),
      path.join(root, '..', 'docs', 'ESTUDOS'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return '';
  }

  scanAll(): StudyScore[] {
    if (!this.estudosDir) return [];

    const gaps = this.studyIntensifier.scanGaps();
    const files = fs.readdirSync(this.estudosDir).filter(f => f.endsWith('.md'));
    const scores: StudyScore[] = [];

    for (const file of files) {
      const filePath = path.join(this.estudosDir, file);
      const gap = gaps.find(g => g.filePath === filePath);
      const previousScore = this.previousScores.get(file) ?? 5;

      let score = 5;
      let missingSections: string[] = [];

      if (gap) {
        score = gap.currentScore;
        missingSections = gap.missing;
      }

      this.previousScores.set(file, score);

      scores.push({
        name: file.replace('.md', ''),
        filePath,
        score,
        previousScore,
        missingSections,
        lastScanned: Date.now(),
      });
    }

    scores.sort((a, b) => a.score - b.score);

    this.emit('scan:complete', { scores, timestamp: Date.now() });
    return scores;
  }

  startContinuousMonitoring(intervalMs: number = 30 * 60 * 1000): void {
    if (this.monitoringTimer) {
      this.log('Monitoring already running');
      return;
    }

    this.log(`Starting continuous monitoring every ${Math.round(intervalMs / 60000)}min`);

    const runScan = () => {
      try {
        const scores = this.scanAll();
        const avgScore = scores.length > 0
          ? Math.round((scores.reduce((s, sc) => s + sc.score, 0) / scores.length) * 10) / 10
          : 0;

        const degraded = scores.filter(s => s.score < s.previousScore);
        const improved = scores.filter(s => s.score > s.previousScore);

        const entry: MonitoringEntry = {
          timestamp: Date.now(),
          averageScore: avgScore,
          totalStudies: scores.length,
          degraded,
          improved,
        };

        this.monitoringHistory.push(entry);
        if (this.monitoringHistory.length > 100) this.monitoringHistory.shift();

        if (degraded.length > 0) {
          this.log(`⚠️ ${degraded.length} studies degraded`);
          this.emit('monitoring:degraded', { entries: degraded, timestamp: Date.now() });
        }
        if (improved.length > 0) {
          this.log(`✓ ${improved.length} studies improved`);
        }

        this.log(`Avg score: ${avgScore}/5 (${scores.length} studies)`);
        this.emit('monitoring:tick', { entry, timestamp: Date.now() });
      } catch (_err) {
        this.log(`Scan error: ${err instanceof Error ? err.message : String(err)}`);
        this.emit('monitoring:error', { error: err, timestamp: Date.now() });
      }
    };

    runScan();
    this.monitoringTimer = setInterval(runScan, intervalMs);
  }

  stopContinuousMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      this.log('Monitoring stopped');
    }
  }

  getMonitoringHistory(): MonitoringEntry[] {
    return [...this.monitoringHistory];
  }

  getLatestScores(): StudyScore[] {
    return this.scanAll();
  }

  alertOnDegradation(threshold: number): void {
    const scores = this.scanAll();
    const degraded = scores.filter(s => s.score < threshold);

    if (degraded.length > 0) {
      this.emit('monitoring:degraded', { entries: degraded, threshold, timestamp: Date.now() });
      for (const d of degraded) {
        this.log(`ALERT: ${d.name} score ${d.score} is below threshold ${threshold}`);
      }
    }

    const avgScore = scores.length > 0
      ? scores.reduce((s, sc) => s + sc.score, 0) / scores.length
      : 0;

    if (avgScore < threshold) {
      this.emit('monitoring:critical', { averageScore: avgScore, threshold, timestamp: Date.now() });
      this.log(`CRITICAL: Average score ${avgScore.toFixed(1)} is below threshold ${threshold}`);
    }
  }

  isMonitoring(): boolean {
    return this.monitoringTimer !== null;
  }
}

export function createStudyScanner(root: string, verbose?: boolean): StudyScanner {
  return new StudyScanner(root, verbose);
}
