import { ProgressBar, createProgressBar } from '../progress-bar';

describe('ProgressBar', () => {
  let progressBar: ProgressBar;

  beforeEach(() => {
    progressBar = createProgressBar({ text: 'Processing' });
  });

  afterEach(() => {
    progressBar.stop();
  });

  describe('createProgressBar', () => {
    it('should create a progress bar', () => {
      expect(progressBar).toBeInstanceOf(ProgressBar);
    });
  });

  describe('setTotalSteps', () => {
    it('should set total steps', () => {
      progressBar.setTotalSteps(10);
      progressBar.advance(5);
      expect(progressBar.getETA()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('advance', () => {
    it('should advance progress', () => {
      progressBar.setTotalSteps(10);
      progressBar.advance(1);
      progressBar.advance(2);
      expect(progressBar.getETA()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('setText', () => {
    it('should update text', () => {
      progressBar.setText('New text');
      progressBar.stop();
    });
  });

  describe('getElapsedMs', () => {
    it('should return elapsed time', () => {
      const elapsed = progressBar.getElapsedMs();
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('getETA', () => {
    it('should return 0 when no steps set', () => {
      expect(progressBar.getETA()).toBe(0);
    });

    it('should estimate ETA when steps are set', () => {
      progressBar.setTotalSteps(10);
      progressBar.advance(1);
      const eta = progressBar.getETA();
      expect(eta).toBeGreaterThanOrEqual(0);
    });
  });
});
