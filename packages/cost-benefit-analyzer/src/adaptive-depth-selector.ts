export class AdaptiveDepthSelector {
  private _adaptiveThreshold = 0.20;
  private _calibrationPoints = 0;

  select(roi: number, complexity: number): 'none' | 'shallow' | 'medium' | 'deep' {
    if (roi < this._adaptiveThreshold) return 'none';
    if (roi < 0.5) return 'shallow';
    if (roi < 1.0) return 'medium';
    if (complexity > 0.7) return 'deep';
    if (complexity > 0.5) return 'medium';
    return 'shallow';
  }

  calibrate(error: number): void {
    this._calibrationPoints++;
    if (error > 0.5 && this._calibrationPoints > 5) {
      this._adaptiveThreshold = Math.min(0.35, this._adaptiveThreshold + 0.02);
    } else if (error < 0.2 && this._calibrationPoints > 10) {
      this._adaptiveThreshold = Math.max(0.10, this._adaptiveThreshold - 0.01);
    }
  }

  getThreshold(): number { return this._adaptiveThreshold; }

  setThreshold(value: number): void { this._adaptiveThreshold = value; }
}
