import { PRIORITY, sortByPriority, highestPriority } from '../priority';

describe('PRIORITY constants', () => {
  it('should have correct values', () => {
    expect(PRIORITY.LOW).toBe(100);
    expect(PRIORITY.NORMAL).toBe(500);
    expect(PRIORITY.HIGH).toBe(1000);
    expect(PRIORITY.CRITICAL).toBe(2000);
    expect(PRIORITY.DEFAULT).toBe(500);
  });

  it('should have NORMAL equal to DEFAULT', () => {
    expect(PRIORITY.NORMAL).toBe(PRIORITY.DEFAULT);
  });
});

describe('sortByPriority', () => {
  it('should sort items in descending priority order', () => {
    const items = [
      { priority: 100 },
      { priority: 1000 },
      { priority: 500 },
    ];

    const sorted = sortByPriority(items);

    expect(sorted[0].priority).toBe(1000);
    expect(sorted[1].priority).toBe(500);
    expect(sorted[2].priority).toBe(100);
  });

  it('should not mutate the original array reference', () => {
    const items = [
      { priority: 100 },
      { priority: 1000 },
    ];

    const sorted = sortByPriority(items);

    expect(sorted).not.toBe(items);
    expect(sorted).toHaveLength(2);
  });

  it('should return empty array for empty input', () => {
    const result = sortByPriority([]);
    expect(result).toEqual([]);
  });

  it('should use PRIORITY constants in sorting', () => {
    const items = [
      { priority: PRIORITY.LOW },
      { priority: PRIORITY.CRITICAL },
      { priority: PRIORITY.HIGH },
      { priority: PRIORITY.NORMAL },
    ];

    const sorted = sortByPriority(items);
    expect(sorted[0].priority).toBe(PRIORITY.CRITICAL);
    expect(sorted[1].priority).toBe(PRIORITY.HIGH);
    expect(sorted[2].priority).toBe(PRIORITY.NORMAL);
    expect(sorted[3].priority).toBe(PRIORITY.LOW);
  });

  it('should handle equal priorities', () => {
    const items = [
      { priority: 500, id: 'b' },
      { priority: 500, id: 'a' },
    ];

    const sorted = sortByPriority(items);
    expect(sorted).toHaveLength(2);
    expect(sorted[0].priority).toBe(500);
    expect(sorted[1].priority).toBe(500);
  });
});

describe('highestPriority', () => {
  it('should return the item with highest priority', () => {
    const items = [
      { priority: 100 },
      { priority: 500 },
      { priority: 1000 },
    ];

    const result = highestPriority(items);
    expect(result).toBeDefined();
    expect(result!.priority).toBe(1000);
  });

  it('should return undefined for empty array', () => {
    const result = highestPriority([]);
    expect(result).toBeUndefined();
  });

  it('should return the single item when there is only one', () => {
    const items = [{ priority: 500 }];
    const result = highestPriority(items);
    expect(result).toBe(items[0]);
  });

  it('should return first highest when priorities are equal', () => {
    const items = [
      { priority: 1000, id: 'first' },
      { priority: 1000, id: 'second' },
    ];

    const result = highestPriority(items);
    expect(result).toBeDefined();
    expect(result!.priority).toBe(1000);
  });

  it('should work with PRIORITY constants', () => {
    const items = [
      { priority: PRIORITY.LOW },
      { priority: PRIORITY.CRITICAL },
    ];

    const result = highestPriority(items);
    expect(result!.priority).toBe(PRIORITY.CRITICAL);
  });
});
