jest.mock('@ideia/core-contributions', () => ({
  Emitter: class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    event = (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return { dispose: () => { const i = this.listeners.indexOf(listener); if (i >= 0) this.listeners.splice(i, 1); } };
    };
    fire(e: T) { this.listeners.forEach(l => l(e)); }
    dispose() { this.listeners = []; }
  },
  DisposableCollection: class DisposableCollection {
    private disposables: Array<{ dispose: () => void }> = [];
    push(d: { dispose: () => void }) { this.disposables.push(d); return d; }
    dispose() { this.disposables.forEach(d => d.dispose()); this.disposables = []; }
  },
}));

jest.mock('@ideia/command-system', () => ({
  DefaultCommandRegistry: jest.fn(),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DefaultKeybindingRegistry } from '../registry';
import { TipDisplay, Tip } from '../tip-display';

describe('TipDisplay', () => {
  let registry: DefaultKeybindingRegistry;
  let tipDisplay: TipDisplay;

  beforeEach(() => {
    registry = new DefaultKeybindingRegistry();
    tipDisplay = new TipDisplay(registry);
  });

  it('can be constructed with registry', () => {
    expect(tipDisplay).toBeDefined();
  });

  it('showTip returns a tip for beginners', () => {
    const tip = tipDisplay.showTip();
    expect(tip).toBeDefined();
    expect(tip!.id).toBeTruthy();
    expect(tip!.message).toBeTruthy();
  });

  it('getTipOfTheDay returns a tip', () => {
    const tip = tipDisplay.getTipOfTheDay();
    expect(tip).toBeDefined();
    expect(tip!.id).toBeTruthy();
  });

  it('dismissTip prevents tip from showing again', () => {
    const first = tipDisplay.showTip();
    expect(first).toBeDefined();
    tipDisplay.dismissTip(first!.id);

    const dismissed = tipDisplay.getDismissedTips();
    expect(dismissed).toContain(first!.id);
  });

  it('getDismissedTips returns dismissed ids', () => {
    tipDisplay.dismissTip('tip-1');
    tipDisplay.dismissTip('tip-2');
    expect(tipDisplay.getDismissedTips()).toHaveLength(2);
    expect(tipDisplay.getDismissedTips()).toContain('tip-1');
    expect(tipDisplay.getDismissedTips()).toContain('tip-2');
  });

  it('resetDismissed clears all dismissed tips', () => {
    tipDisplay.dismissTip('tip-1');
    tipDisplay.resetDismissed();
    expect(tipDisplay.getDismissedTips()).toHaveLength(0);
  });

  it('setProfile changes profile to expert', () => {
    tipDisplay.setProfile('expert');
    const tip = tipDisplay.showTip();
    expect(tip).toBeDefined();
  });

  it('getAllTips returns all tips', () => {
    const tips = tipDisplay.getAllTips();
    expect(tips.length).toBeGreaterThanOrEqual(10);
  });

  it('can be constructed with custom tips', () => {
    const customTips: Tip[] = [
      { id: 'custom-1', message: 'Custom tip', profile: ['beginner'], category: 'general' },
    ];
    const custom = new TipDisplay(registry, { tips: customTips, profile: 'beginner' });
    const tip = custom.showTip();
    expect(tip).toBeDefined();
    expect(tip!.id).toBe('custom-1');
  });
});
