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
export declare class UsabilityProfileEngine {
    private profile;
    private interactions;
    private profilePath;
    private teamPolicy;
    constructor(workspaceRoot: string);
    private loadProfile;
    private defaultProfile;
    private saveProfile;
    recordInteraction(action: string, result: 'approved' | 'rejected' | 'ignored', responseTimeMs?: number): void;
    getProfile(): UserProfile;
    getRecommendation(): ProfileRecommendation;
    reset(): void;
    learnFromFeedback(action: string, approved: boolean): void;
    getSuggestedConfig(): Record<string, unknown>;
    setTeamPolicy(policy: TeamPolicy): void;
    checkTeamPolicy(config: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
    };
    getTeamPolicy(): TeamPolicy | null;
}
//# sourceMappingURL=usability-profile.d.ts.map