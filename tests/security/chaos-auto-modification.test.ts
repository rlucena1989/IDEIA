import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SafetyCircuit } from '../../packages/safety-circuit/src/safety-circuit';

describe('Chaos: Auto-Modification Loop', () => {
  let safetyCircuit: SafetyCircuit;

  beforeEach(() => {
    safetyCircuit = new SafetyCircuit();
  });

  it('should allow first few modifications', async () => {
    for (let i = 0; i < 5; i++) {
      const decision = await safetyCircuit.evaluate({
        type: 'loop-detection',
        file: 'src/test.ts',
        metadata: { loop: i + 1 },
      });
      expect(decision.action).toBe('allow');
    }
  });

  it('should pause after exceeding loop threshold', async () => {
    const file = 'src/infinite-loop.ts';
    for (let i = 0; i < 5; i++) {
      await safetyCircuit.evaluate({ type: 'loop-detection', file });
    }
    const decision = await safetyCircuit.evaluate({ type: 'loop-detection', file });
    expect(decision.action).toBe('pause');
    expect(decision.severity).toBe('warning');
  });

  it('should detect loop across different files independently', async () => {
    for (let i = 0; i < 6; i++) {
      const decision = await safetyCircuit.evaluate({
        type: 'loop-detection',
        file: 'src/a.ts',
      });
      if (i < 5) {
        expect(decision.action).toBe('allow');
      } else {
        expect(decision.action).toBe('pause');
      }
    }
    const decisionB = await safetyCircuit.evaluate({ type: 'loop-detection', file: 'src/b.ts' });
    expect(decisionB.action).toBe('allow');
  });

  it('should reset loop window after timeout', async () => {
    const file = 'src/reset-test.ts';
    for (let i = 0; i < 5; i++) {
      await safetyCircuit.evaluate({ type: 'loop-detection', file });
    }
    const originalNow = Date.now;
    const fakeFuture = Date.now() + 3600001;
    Date.now = jest.fn(() => fakeFuture) as unknown as () => number;
    const decision = await safetyCircuit.evaluate({ type: 'loop-detection', file });
    expect(decision.action).toBe('allow');
    Date.now = originalNow;
  });

  it('should activate trigger on loop detection', async () => {
    const file = 'src/trigger-test.ts';
    for (let i = 0; i < 6; i++) {
      await safetyCircuit.evaluate({ type: 'loop-detection', file });
    }
    const status = safetyCircuit.getStatus();
    expect(status.mode).toBe('pause');
    expect(status.activeTriggers.length).toBeGreaterThanOrEqual(1);
    expect(status.activeTriggers[0]?.type).toBe('loop-detection');
  });

  it('should stop infinite modification loop via circuit breaker', async () => {
    const file = 'src/vulnerable.ts';
    for (let i = 0; i < 6; i++) {
      const decision = await safetyCircuit.evaluate({
        type: 'loop-detection',
        file,
        metadata: { iteration: i },
      });
      if (i < 5) {
        expect(decision.action).toBe('allow');
      } else {
        expect(decision.action).toBe('pause');
      }
    }
    const status = safetyCircuit.getStatus();
    expect(status.mode).toBe('pause');
  });
});
