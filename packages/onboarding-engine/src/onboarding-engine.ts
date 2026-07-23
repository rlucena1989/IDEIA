import * as fs from 'fs'; import * as path from 'path'; import { OnboardingState } from './types';
const CONFIG_DIR = '.ai/config'; const CONFIG_FILE = 'onboarding.json';
export class OnboardingEngine {
  private state: OnboardingState;
  constructor(private storagePath?: string) {
    this.state = this.load();
  }
  start(): OnboardingState {
    this.state = { completed: false, currentStep: 1, totalSteps: 4, llmConfigured: false, tutorialProgress: 0, startedAt: new Date().toISOString() };
    this.save(); return this.state;
  }
  completeStep(step: number): void { this.state.currentStep = Math.min(step + 1, this.state.totalSteps); this.save(); }
  setStack(stack: string): void { this.state.stackDetected = stack; this.save(); }
  setLLMConfigured(): void { this.state.llmConfigured = true; this.save(); }
  setMode(mode: string): void { this.state.modeSelected = mode; this.save(); }
  complete(): void { this.state.completed = true; this.state.completedAt = new Date().toISOString(); this.save(); }
  restart(): void { this.state = { completed: false, currentStep: 1, totalSteps: 4, llmConfigured: false, tutorialProgress: 0, startedAt: new Date().toISOString() }; this.save(); }
  getStatus(): OnboardingState { return { ...this.state }; }
  isComplete(): boolean { return this.state.completed; }
  updateTutorialProgress(progress: number): void { this.state.tutorialProgress = Math.min(100, Math.max(0, progress)); this.save(); }
  private load(): OnboardingState {
    try {
      const f = path.join(this.storagePath || process.cwd(), CONFIG_DIR, CONFIG_FILE);
      if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
    } catch {}
    return { completed: false, currentStep: 1, totalSteps: 4, llmConfigured: false, tutorialProgress: 0, startedAt: new Date().toISOString() };
  }
  private save(): void {
    const dir = path.join(this.storagePath || process.cwd(), CONFIG_DIR);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify(this.state), 'utf-8');
  }
}
export function createOnboardingEngine(storagePath?: string): OnboardingEngine { return new OnboardingEngine(storagePath); }
