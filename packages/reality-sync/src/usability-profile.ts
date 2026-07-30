import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import * as path from 'node:path';
const logger = createLogger('usability-profile');

export interface UserProfile {
  preferredLevel: 'passive' | 'assisted' | 'autonomous';
  approvalRate: number;
  responseTimeMs: number;
  riskTolerance: 'low' | 'medium' | 'high';
  totalInteractions: number;
  approvedActions: number;
  rejectedActions: number;
  lastUpdated: number;
  averageResponseTime: number;
  preferredCategories: string[];
  teamPolicies?: TeamPolicy;
}

export interface ProfileRecommendation {
  suggestedLevel: 'passive' | 'assisted' | 'autonomous';
  confidence: number;
  reason: string;
  suggestedRiskThreshold: 'low' | 'medium' | 'high';
}

export interface TeamPolicy {
  minimumScanners: string[];
  mandatoryNotifications: boolean;
  blockedCategories: string[];
  requireApprovalFor: string[];
  maxAutonomyLevel: 'passive' | 'assisted' | 'autonomous';
}

interface Interaction {
  action: string;
  result: 'approved' | 'rejected' | 'ignored';
  responseTimeMs: number;
  timestamp: number;
}

const DEFAULT_PROFILE_PATH = '.ai/usability-profile.json';

export class UsabilityProfileEngine {
  private profile: UserProfile;
  private interactions: Interaction[] = [];
  private profilePath: string;
  private teamPolicy: TeamPolicy | null = null;

  constructor(workspaceRoot: string) {
    this.profilePath = path.join(workspaceRoot, DEFAULT_PROFILE_PATH);
    this.profile = this.loadProfile();
  }

  private loadProfile(): UserProfile {
    try {
      if (fs.existsSync(this.profilePath)) {
        const raw = fs.readFileSync(this.profilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch { /* ignore */ }
    return this.defaultProfile();
  }

  private defaultProfile(): UserProfile {
    return {
      preferredLevel: 'assisted',
      approvalRate: 0,
      responseTimeMs: 0,
      riskTolerance: 'medium',
      totalInteractions: 0,
      approvedActions: 0,
      rejectedActions: 0,
      lastUpdated: Date.now(),
      averageResponseTime: 0,
      preferredCategories: ['package', 'governance', 'quality'],
    };
  }

  private saveProfile(): void {
    const dir = path.dirname(this.profilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.profilePath, JSON.stringify(this.profile, null, 2), 'utf-8');
  }

  recordInteraction(action: string, result: 'approved' | 'rejected' | 'ignored', responseTimeMs?: number): void {
    const interaction: Interaction = {
      action,
      result,
      responseTimeMs: responseTimeMs ?? 0,
      timestamp: Date.now(),
    };
    this.interactions.push(interaction);
    if (this.interactions.length > 1000) this.interactions.shift();

    this.profile.totalInteractions++;
    if (result === 'approved') this.profile.approvedActions++;
    if (result === 'rejected') this.profile.rejectedActions++;

    if (responseTimeMs) {
      const total = this.profile.averageResponseTime * (this.profile.totalInteractions - 1) + responseTimeMs;
      this.profile.averageResponseTime = total / this.profile.totalInteractions;
    }

    this.profile.approvalRate = this.profile.totalInteractions > 0
      ? this.profile.approvedActions / this.profile.totalInteractions
      : 0;

    this.profile.lastUpdated = Date.now();
    this.saveProfile();
  }

  getProfile(): UserProfile {
    return { ...this.profile };
  }

  getRecommendation(): ProfileRecommendation {
    const rate = this.profile.approvalRate;
    const avgTime = this.profile.averageResponseTime;
    const total = this.profile.totalInteractions;

    if (total < 5) {
      return {
        suggestedLevel: 'assisted',
        confidence: 0.3,
        reason: 'Insufficient interaction data (< 5)',
        suggestedRiskThreshold: 'medium',
      };
    }

    if (rate > 0.85 && avgTime < 10_000) {
      return {
        suggestedLevel: 'autonomous',
        confidence: rate,
        reason: `High approval rate (${(rate * 100).toFixed(0)}%) and fast responses (${Math.round(avgTime)}ms avg)`,
        suggestedRiskThreshold: 'high',
      };
    }

    if (rate > 0.6 && avgTime < 60_000) {
      return {
        suggestedLevel: 'assisted',
        confidence: rate,
        reason: `Moderate approval rate (${(rate * 100).toFixed(0)}%) with reasonable response time`,
        suggestedRiskThreshold: 'medium',
      };
    }

    return {
      suggestedLevel: 'passive',
      confidence: 1 - rate,
      reason: `Low approval rate (${(rate * 100).toFixed(0)}%) or slow responses`,
      suggestedRiskThreshold: 'low',
    };
  }

  reset(): void {
    this.profile = this.defaultProfile();
    this.interactions = [];
    this.saveProfile();
  }

  learnFromFeedback(action: string, approved: boolean): void {
    const result = approved ? 'approved' : 'rejected';
    this.recordInteraction(action, result);
    this.saveProfile();
  }

  getSuggestedConfig(): Record<string, unknown> {
    const rec = this.getRecommendation();
    return {
      level: rec.suggestedLevel,
      riskThreshold: rec.suggestedRiskThreshold,
      autoFixCategories: this.profile.preferredCategories,
    };
  }

  setTeamPolicy(policy: TeamPolicy): void {
    this.teamPolicy = policy;
    this.profile.teamPolicies = policy;
    this.saveProfile();
  }

  checkTeamPolicy(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = this.teamPolicy;
    if (!policy) return { valid: true, errors: [] };

    const level = config['level'] as string;
    if (level && policy.maxAutonomyLevel) {
      const levels = ['passive', 'assisted', 'autonomous'];
      if (levels.indexOf(level) > levels.indexOf(policy.maxAutonomyLevel)) {
        errors.push(`Level ${level} exceeds team max: ${policy.maxAutonomyLevel}`);
      }
    }

    const categories = config['autoFixCategories'] as string[] | undefined;
    if (categories && policy.blockedCategories.length > 0) {
      for (const cat of categories) {
        if (policy.blockedCategories.includes(cat)) {
          errors.push(`Category ${cat} is blocked by team policy`);
        }
      }
    }

    if (policy.mandatoryNotifications && config['notificationsEnabled'] === false) {
      errors.push('Notifications are mandatory per team policy');
    }

    return { valid: errors.length === 0, errors };
  }

  getTeamPolicy(): TeamPolicy | null {
    return this.teamPolicy ? { ...this.teamPolicy } : null;
  }
}
