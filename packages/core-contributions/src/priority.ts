export interface Prioritizable {
  priority: number;
}

export function sortByPriority<T extends Prioritizable>(items: T[]): T[] {
  return [...items].sort((a, b) => b.priority - a.priority);
}

export function highestPriority<T extends Prioritizable>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items.reduce((best, current) =>
    current.priority > best.priority ? current : best
  );
}

export const PRIORITY = {
  LOW: 100,
  NORMAL: 500,
  HIGH: 1000,
  CRITICAL: 2000,
  DEFAULT: 500,
} as const;
