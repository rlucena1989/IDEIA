import { evaluatePolicy, evaluateBatch } from '../src/policy';

describe('PolicyEngine', () => {
  // ── Testes existentes ──

  describe('evaluatePolicy', () => {
    it('should auto-approve low risk actions', () => {
      const result = evaluatePolicy({ actionType: 'file.read', riskLevel: 'low' });
      expect(result.decision).toBe('auto');
      expect(result.reason).toContain('auto-approved');
    });

    it('should return ask for medium risk actions', () => {
      const result = evaluatePolicy({ actionType: 'file.write', riskLevel: 'medium' });
      expect(result.decision).toBe('ask');
      expect(result.reason).toContain('approval');
    });

    it('should return block for high risk actions', () => {
      const result = evaluatePolicy({ actionType: 'file.delete', riskLevel: 'high' });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('blocked');
    });

    it('should return ask for file.delete even without risk level', () => {
      const result = evaluatePolicy({ actionType: 'file.delete' });
      expect(result.decision).toBe('ask');
    });

    it('should return ask for shell.exec', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec' });
      expect(result.decision).toBe('ask');
    });

    it('should block destructive resource patterns', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'rm -rf /' });
      expect(result.decision).toBe('block');
    });

    it('should block shutdown commands', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'shutdown now' });
      expect(result.decision).toBe('block');
    });

    it('should auto-approve safe commands (non-high-risk, no riskLevel)', () => {
      const result = evaluatePolicy({ actionType: 'file.read', resource: 'ls -la' });
      expect(result.decision).toBe('auto');
    });

    // ── Novos testes ──

    it('should block reboot commands', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'reboot now' });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('blocked');
    });

    it('should block eval() execution', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'eval("malicious")' });
      expect(result.decision).toBe('block');
    });

    it('should block exec() execution', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'exec("dangerous")' });
      expect(result.decision).toBe('block');
    });

    it('should block fork bomb pattern', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: ':(){ :|:& };:' });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('blocked');
    });

    it('should block format command', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'format /fs:ntfs' });
      expect(result.decision).toBe('block');
    });

    it('should block dd command', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'dd if=/dev/zero of=/dev/sda' });
      expect(result.decision).toBe('block');
    });

    it('should block Remove-Item Recurse on PowerShell', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'Remove-Item -Recurse C:\\' });
      expect(result.decision).toBe('block');
    });

    it('should block direct disk writes via redirect', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'echo test > /dev/sda' });
      expect(result.decision).toBe('block');
    });

    it('should block rm with --no-preserve-root', () => {
      const result = evaluatePolicy({ actionType: 'shell.exec', resource: 'rm -rf --no-preserve-root /' });
      expect(result.decision).toBe('block');
    });

    it('should ask for user.create action', () => {
      const result = evaluatePolicy({ actionType: 'user.create' });
      expect(result.decision).toBe('ask');
    });

    it('should ask for policy.change action', () => {
      const result = evaluatePolicy({ actionType: 'policy.change' });
      expect(result.decision).toBe('ask');
    });

    it('should block action with explicit high risk level', () => {
      const result = evaluatePolicy({ actionType: 'file.read', riskLevel: 'high' });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('high risk');
    });

    it('should handle empty resource gracefully', () => {
      const result = evaluatePolicy({ actionType: 'file.read', resource: '' });
      expect(result.decision).toBe('auto');
    });

    it('should auto-approve unknown action without risk', () => {
      const result = evaluatePolicy({ actionType: 'unknown.action' });
      expect(result.decision).toBe('auto');
    });
  });

  describe('evaluateBatch', () => {
    it('should evaluate multiple inputs', () => {
      const inputs = [
        { actionType: 'file.read', riskLevel: 'low' as const },
        { actionType: 'file.delete', riskLevel: 'high' as const },
        { actionType: 'shell.exec', riskLevel: 'medium' as const },
      ];
      const results = evaluateBatch(inputs);
      expect(results).toHaveLength(3);
      // file.read low → auto (low risk auto-approved)
      expect(results[0].decision).toBe('auto');
      // file.delete high → block
      expect(results[1].decision).toBe('block');
      // shell.exec medium → ask (high-risk action check before medium check)
      expect(results[2].decision).toBe('ask');
    });

    it('should handle empty input array', () => {
      const results = evaluateBatch([]);
      expect(results).toHaveLength(0);
    });

    it('should handle errors gracefully per input', () => {
      const inputs = [
        { actionType: 'file.read', riskLevel: 'low' as const },
        null as unknown as { actionType: string; resource?: string; riskLevel?: 'low' | 'medium' | 'high' },
      ];
      const results = evaluateBatch(inputs);
      expect(results).toHaveLength(2);
      expect(results[0].decision).toBe('auto');
      expect(results[1].decision).toBe('block'); // error fallback
    });

    it('should process 100 inputs without error', () => {
      const inputs = Array.from({ length: 100 }, (_, i) => ({
        actionType: i % 3 === 0 ? 'file.read' : i % 3 === 1 ? 'file.delete' : 'shell.exec',
        riskLevel: (['low', 'medium', 'high'] as const)[i % 3],
      }));
      const results = evaluateBatch(inputs);
      expect(results).toHaveLength(100);
    });
  });
});
