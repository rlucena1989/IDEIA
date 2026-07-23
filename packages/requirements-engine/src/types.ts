export type RequirementCategory = 'functional' | 'non_functional' | 'security' | 'performance' | 'compliance' | 'ux';
export type RequirementStatus = 'draft' | 'review' | 'approved' | 'implemented' | 'verified' | 'rejected';
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Requirement {
  id: string;
  title: string;
  description?: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  status: RequirementStatus;
  source?: string;
  acceptanceCriteria: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  owner?: string;
  dependsOn: string[];
}

export interface RequirementCreate {
  title: string;
  description?: string;
  category: RequirementCategory;
  priority?: RequirementPriority;
  source?: string;
  acceptanceCriteria?: string[];
  tags?: string[];
  owner?: string;
  dependsOn?: string[];
}

export interface RequirementUpdate {
  title?: string;
  description?: string;
  category?: RequirementCategory;
  priority?: RequirementPriority;
  status?: RequirementStatus;
  source?: string;
  acceptanceCriteria?: string[];
  tags?: string[];
  owner?: string;
  dependsOn?: string[];
}

export interface RequirementSummary {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}
