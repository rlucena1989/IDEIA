import { DefaultNavigationService } from '../navigation';
import { EditorSelection } from '../types';

describe('DefaultNavigationService', () => {
  let service: DefaultNavigationService;

  const sel1: EditorSelection = { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 };
  const sel2: EditorSelection = { startLine: 10, startColumn: 1, endLine: 10, endColumn: 5 };
  const sel3: EditorSelection = { startLine: 20, startColumn: 5, endLine: 25, endColumn: 15 };

  beforeEach(() => {
    service = new DefaultNavigationService();
  });

  describe('navigateTo', () => {
    it('adds a location to the back stack', () => {
      service.navigateTo('file.ts', sel1);
      expect(service.canGoBack()).toBe(true);
    });

    it('clears the forward stack on new navigation', () => {
      service.navigateTo('file1.ts', sel1);
      service.goBack();
      expect(service.canGoForward()).toBe(true);
      service.navigateTo('file3.ts', sel3);
      expect(service.canGoForward()).toBe(false);
    });

    it('limits the back stack to max size', () => {
      for (let i = 0; i < 60; i++) {
        service.navigateTo(`file${i}.ts`, sel1);
      }
      // pop off all so we can count
      while (service.canGoBack()) {
        service.goBack();
      }
      expect(service.getBackStack().length).toBeLessThanOrEqual(50);
    });
  });

  describe('goBack', () => {
    it('returns promise and moves location to forward stack', async () => {
      service.navigateTo('file.ts', sel1);
      service.navigateTo('file2.ts', sel2);
      expect(service.canGoBack()).toBe(true);
      await service.goBack();
      expect(service.canGoForward()).toBe(true);
    });

    it('does nothing when back stack is empty', async () => {
      expect(service.canGoBack()).toBe(false);
      await service.goBack();
      expect(service.canGoForward()).toBe(false);
    });
  });

  describe('goForward', () => {
    it('moves location from forward to back stack', async () => {
      service.navigateTo('file.ts', sel1);
      service.navigateTo('file2.ts', sel2);
      await service.goBack();
      expect(service.canGoBack()).toBe(true);
      expect(service.canGoForward()).toBe(true);
      await service.goForward();
      expect(service.canGoForward()).toBe(false);
    });

    it('does nothing when forward stack is empty', async () => {
      await service.goForward();
      expect(service.canGoBack()).toBe(false);
    });
  });

  describe('canGoBack', () => {
    it('returns false when back stack is empty', () => {
      expect(service.canGoBack()).toBe(false);
    });

    it('returns true when there are back locations', () => {
      service.navigateTo('file.ts', sel1);
      expect(service.canGoBack()).toBe(true);
    });
  });

  describe('canGoForward', () => {
    it('returns false when forward stack is empty', () => {
      expect(service.canGoForward()).toBe(false);
    });

    it('returns true after going back', async () => {
      service.navigateTo('file.ts', sel1);
      service.navigateTo('file2.ts', sel2);
      await service.goBack();
      expect(service.canGoForward()).toBe(true);
    });
  });

  describe('clear', () => {
    it('clears both back and forward stacks', () => {
      service.navigateTo('file.ts', sel1);
      service.navigateTo('file2.ts', sel2);
      expect(service.canGoBack()).toBe(true);
      service.clear();
      expect(service.canGoBack()).toBe(false);
      expect(service.canGoForward()).toBe(false);
    });
  });

  describe('getBackStack / getForwardStack', () => {
    it('returns copies of the stacks', () => {
      service.navigateTo('file.ts', sel1);
      const back = service.getBackStack();
      expect(back).toHaveLength(1);
      expect(back[0].uri).toBe('file.ts');
      expect(back[0].selection).toEqual(sel1);
      expect(service.getForwardStack()).toHaveLength(0);
    });

    it('returned arrays are not references to internal stacks', () => {
      service.navigateTo('file.ts', sel1);
      const back = service.getBackStack();
      back.push({ uri: 'fake', selection: sel1, timestamp: 0 });
      expect(service.getBackStack()).toHaveLength(1);
    });
  });
});
