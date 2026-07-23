export type FeedbackSource = 'user' | 'system' | 'ai' | 'reviewer' | 'ci';
export type FeedbackSeverity = 'info' | 'warning' | 'error' | 'critical';
export type FeedbackDecision = 'approved' | 'rejected' | 'pending';

export interface FeedbackEntry {
  id: string;
  type: 'approval' | 'rejection' | 'suggestion' | 'question' | 'comment' | 'issue';
  source: FeedbackSource;
  targetType: string;
  targetId: string;
  content: string;
  severity: FeedbackSeverity;
  decision: FeedbackDecision;
  createdAt: string;
  createdBy?: string;
  tags: string[];
}

export interface Recommendation {
  id: string;
  sourceFeedbackId: string;
  type: 'improvement' | 'fix' | 'refactor' | 'investigate' | 'document';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetType: string;
  targetId: string;
  status: 'open' | 'applied' | 'dismissed';
  createdAt: string;
}

export interface MemoryEntry {
  id: string;
  sourceFeedbackId: string;
  sourceRecommendationId?: string;
  type: 'pattern' | 'pitfall' | 'decision' | 'preference' | 'convention';
  title: string;
  description: string;
  tags: string[];
  sessionOrigin: string;
  timestamp: string;
}

export interface FeedbackSubmission {
  type: FeedbackEntry['type'];
  source: FeedbackSource;
  targetType: string;
  targetId: string;
  content: string;
  severity?: FeedbackSeverity;
  createdBy?: string;
  tags?: string[];
}
