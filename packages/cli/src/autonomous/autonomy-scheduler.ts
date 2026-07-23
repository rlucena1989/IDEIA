export interface ScheduleEntry {
  entryId: string;
  action: string;
  dueAt: string;
  completed: boolean;
}

export function createScheduleEntry(action: string, delayMs: number = 60000): ScheduleEntry {
  return {
    entryId: `sched-${Date.now()}`,
    action,
    dueAt: new Date(Date.now() + delayMs).toISOString(),
    completed: false,
  };
}
