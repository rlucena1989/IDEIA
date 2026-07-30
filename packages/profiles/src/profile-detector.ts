import { Interaction, UserInteractionTracker } from './interaction-tracker';
import { createLogger } from '@ideia/logger';
import { ExperienceLevel, UsabilityProfile, UsabilityProfileResult } from './usability-profile';
const logger = createLogger('profile-detector');

export interface DetectionResult {
  profile: ExperienceLevel;
  confidence: number;
  metrics: UsabilityProfileResult['metrics'];
  detectedAt: string;
}

export class ProfileDetector {
  private usabilityProfile: UsabilityProfile;
  private lastResult: DetectionResult | null = null;
  private detectionCount = 0;

  constructor(usabilityProfile?: UsabilityProfile) {
    this.usabilityProfile = usabilityProfile ?? new UsabilityProfile();
  }

  detect(interactions: Interaction[]): DetectionResult {
    const result = this.usabilityProfile.detect(interactions);
    this.detectionCount++;

    const detection: DetectionResult = {
      profile: result.level,
      confidence: result.confidence,
      metrics: result.metrics,
      detectedAt: new Date().toISOString(),
    };

    this.lastResult = detection;
    return detection;
  }

  detectFromTracker(tracker: UserInteractionTracker): DetectionResult {
    return this.detect(tracker.getInteractions());
  }

  getLastResult(): DetectionResult | null {
    return this.lastResult;
  }

  getDetectionCount(): number {
    return this.detectionCount;
  }

  hasChanged(interactions: Interaction[]): boolean {
    if (!this.lastResult) return true;
    const current = this.detect(interactions);
    return current.profile !== this.lastResult.profile;
  }
}

export function createProfileDetector(usabilityProfile?: UsabilityProfile): ProfileDetector {
  return new ProfileDetector(usabilityProfile);
}
