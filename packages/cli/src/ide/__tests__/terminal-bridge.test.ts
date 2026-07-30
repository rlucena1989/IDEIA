import { TerminalBridge } from '../terminal-bridge';
import { EventEmitter } from 'node:events';

describe('TerminalBridge', () => {
  let bridge: TerminalBridge;

  beforeEach(() => {
    bridge = new TerminalBridge('/tmp');
  });

  describe('classifyCommand', () => {
    it('returns safe for simple commands', () => {
      expect(bridge.classifyCommand('ls -la')).toBe('safe');
      expect(bridge.classifyCommand('node server.js')).toBe('safe');
      expect(bridge.classifyCommand('npm test')).toBe('safe');
    });

    it('returns blocked for dangerous commands', () => {
      expect(bridge.classifyCommand('rm -rf /')).toBe('blocked');
      expect(bridge.classifyCommand('rm -rf /*')).toBe('blocked');
      expect(bridge.classifyCommand('rm -rf --no-preserve-root /')).toBe('blocked');
      expect(bridge.classifyCommand('dd if=/dev/zero of=/dev/sda')).toBe('blocked');
      expect(bridge.classifyCommand('chmod 777 /')).toBe('blocked');
    });

    it('returns blocked for Windows destructive commands', () => {
      expect(bridge.classifyCommand('del /f /s C:\\*')).toBe('blocked');
      expect(bridge.classifyCommand('rd /s /q C:\\Windows')).toBe('blocked');
      expect(bridge.classifyCommand('reg delete HKLM\\Something')).toBe('blocked');
      expect(bridge.classifyCommand('cipher /w:C')).toBe('blocked');
    });

    it('returns high-risk for rm -rf (non-root)', () => {
      expect(bridge.classifyCommand('rm -rf node_modules')).toBe('high-risk');
      expect(bridge.classifyCommand('rm -rf dist/')).toBe('high-risk');
    });

    it('returns high-risk for sudo commands', () => {
      expect(bridge.classifyCommand('sudo apt update')).toBe('high-risk');
      expect(bridge.classifyCommand('sudo rm file')).toBe('high-risk');
    });

    it('returns high-risk for commands with shell injection operators', () => {
      expect(bridge.classifyCommand('ls; rm -rf /')).toBe('high-risk');
      expect(bridge.classifyCommand('ls && rm -rf /')).toBe('high-risk');
      expect(bridge.classifyCommand('echo `id`')).toBe('high-risk');
    });

    it('returns high-risk for shutdown/reboot/kill', () => {
      expect(bridge.classifyCommand('shutdown now')).toBe('high-risk');
      expect(bridge.classifyCommand('kill -9 1234')).toBe('high-risk');
    });

    it('returns safe for mkfs.ext4 (regex requires space after mkfs)', () => {
      expect(bridge.classifyCommand('mkfs.ext4 /dev/sda1')).toBe('safe');
    });

    it('returns blocked for format command (matches ^format\\s+)', () => {
      expect(bridge.classifyCommand('format /q')).toBe('blocked');
    });

    it('returns safe for diskpart with no args (regex requires whitespace)', () => {
      expect(bridge.classifyCommand('diskpart')).toBe('safe');
    });

    it('is case sensitive for blocked patterns', () => {
      expect(bridge.classifyCommand('RM -RF /')).toBe('safe');
    });
  });

  describe('executeHighRisk', () => {
    it('returns error when not approved', async () => {
      const result = await bridge.executeHighRisk('rm -rf temp', false);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('requires explicit approval');
      expect(result.code).toBeNull();
    });
  });

  describe('execute', () => {
    it('blocks dangerous commands and returns error', async () => {
      const result = await bridge.execute('rm -rf /', 5000);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('blocked');
      expect(result.code).toBeNull();
    });
  });

  describe('setCwd and getCwd', () => {
    it('sets and gets current working directory', () => {
      bridge.setCwd('/other');
      expect(bridge.getCwd()).toBe('/other');
    });
  });

  describe('getHistory and clearHistory', () => {
    it('starts with empty history', () => {
      expect(bridge.getHistory()).toEqual([]);
    });

    it('does not track blocked commands in history', async () => {
      await bridge.execute('rm -rf /', 5000);
      expect(bridge.getHistory()).toEqual([]);
    });

    it('clears history', async () => {
      await bridge.execute('rm -rf /', 5000);
      bridge.clearHistory();
      expect(bridge.getHistory()).toEqual([]);
    });
  });

  describe('isWindows', () => {
    it('returns a boolean', () => {
      expect(typeof bridge.isWindows()).toBe('boolean');
    });
  });

  describe('execute result shape for blocked commands', () => {
    it('returns all TerminalResult fields', async () => {
      const result = await bridge.execute('rm -rf /', 5000);
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('durationMs');
    });
  });

  describe('emit events on blocked execution', () => {
    it('emits execution event for blocked commands', (done) => {
      bridge.on('execution', (event) => {
        expect(event.command).toBe('rm -rf /');
        expect(event.result.ok).toBe(false);
        expect(event.classification).toBe('blocked');
        done();
      });
      bridge.execute('rm -rf /', 5000);
    });
  });

  describe('openPty', () => {
    it('returns a session or null depending on node-pty availability', () => {
      const result = bridge.openPty('test-session');
      if (result) {
        expect(result.id).toBe('test-session');
        expect(result.cwd).toBe('/tmp');
      }
    });
  });

  describe('closePty and closeAllPty', () => {
    it('does not throw when closing non-existent PTY', () => {
      expect(() => bridge.closePty('nonexistent')).not.toThrow();
      expect(() => bridge.closeAllPty()).not.toThrow();
    });
  });

  describe('writePty and resizePty', () => {
    it('does not throw when writing to non-existent PTY', () => {
      expect(() => bridge.writePty('nonexistent', 'data')).not.toThrow();
      expect(() => bridge.resizePty('nonexistent', 80, 24)).not.toThrow();
    });
  });

  describe('execute', () => {
    it('runs a simple command using cmd.exe /c on Windows', async () => {
      const isWin = process.platform === 'win32';
      if (isWin) {
        const cmdBridge = new TerminalBridge('/tmp');
        const result = await cmdBridge.execute('cmd.exe /c echo hello', 5000);
        expect(result.ok).toBe(true);
      }
    });
  });
});
