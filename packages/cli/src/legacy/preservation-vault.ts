export class PreservationVault {
  private items: string[] = [];

  store(item: string): void {
    this.items.push(item);
  }

  list(): string[] {
    return [...this.items];
  }

  count(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
