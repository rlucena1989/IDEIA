export class CapabilitySwitchboard {
  private enabled = new Set<string>();

  enable(capability: string): void {
    this.enabled.add(capability);
  }

  disable(capability: string): void {
    this.enabled.delete(capability);
  }

  isEnabled(capability: string): boolean {
    return this.enabled.has(capability);
  }

  list(): string[] {
    return [...this.enabled];
  }

  clear(): void {
    this.enabled.clear();
  }
}
