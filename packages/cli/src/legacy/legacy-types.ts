export interface LegacyState {
  legacyId: string;
  status: 'frozen' | 'archived' | 'preserved' | 'shutdown';
  frozenAt: string;
  preservedItems: string[];
  notes: string[];
}

export interface ArchiveBundle {
  bundleId: string;
  createdAt: string;
  items: string[];
  checksum?: string;
}

export interface RestorationPlan {
  restorationId: string;
  requestedAt: string;
  reason: string;
  allowed: boolean;
  steps: string[];
}
