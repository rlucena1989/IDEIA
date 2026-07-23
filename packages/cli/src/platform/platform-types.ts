export interface PlatformState {
  platformId: string;
  name: string;
  version: string;
  status: 'draft' | 'ready' | 'operational' | 'maintenance' | 'closed';
  healthScore: number;
  autonomyLevel: 'none' | 'assisted' | 'partial' | 'full';
  modules: string[];
  policies: string[];
  updatedAt: string;
}

export interface PlatformVerification {
  verificationId: string;
  verifiedAt: string;
  ok: boolean;
  issues: string[];
  notes: string[];
}

export interface PlatformFinishResult {
  finishId: string;
  finishedAt: string;
  closed: boolean;
  summary: string;
}

export interface PlatformPackage {
  packageId: string;
  createdAt: string;
  version: string;
  contents: string[];
}

export interface MaintenanceTask {
  taskId: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}
