export class PriorityQueue<T> {
  private items: Array<{ value: T; priority: number }> = [];

  push(value: T, priority = 0) {
    this.items.push({ value, priority });
    this.items.sort((a, b) => b.priority - a.priority);
  }

  pop(): T | undefined {
    const item = this.items.shift();
    return item?.value;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}
