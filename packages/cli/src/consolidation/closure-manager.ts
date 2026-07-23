export interface CycleClosure {
  closureId: string;
  closedAt: string;
  completedItems: string[];
  pendingItems: string[];
  notes: string[];
}

export function closeCycle(completedItems: string[], pendingItems: string[]): CycleClosure {
  return {
    closureId: `closure-${Date.now()}`,
    closedAt: new Date().toISOString(),
    completedItems,
    pendingItems,
    notes: pendingItems.length > 0
      ? ['Cycle closed with pending items.']
      : ['Cycle closed cleanly.'],
  };
}
