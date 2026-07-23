import { force, kineticEnergy, potentialEnergy, power, velocityFromEnergy, density, momentum, acceleration } from './physics-engine';

describe('physics-engine', () => {
  it('should compute force', () => {
    expect(force(10, 2)).toBe(20);
  });

  it('should compute kinetic energy', () => {
    expect(kineticEnergy(10, 4)).toBe(80);
  });

  it('should compute potential energy', () => {
    expect(potentialEnergy(10, 5)).toBeCloseTo(490.33, 1);
  });

  it('should compute power', () => {
    expect(power(100, 10)).toBe(10);
  });

  it('should return 0 power when time is 0', () => {
    expect(power(100, 0)).toBe(0);
  });

  it('should compute velocity from energy and mass', () => {
    expect(velocityFromEnergy(200, 8)).toBeCloseTo(7.07, 1);
  });

  it('should return 0 velocity when mass is 0', () => {
    expect(velocityFromEnergy(100, 0)).toBe(0);
  });

  it('should compute density', () => {
    expect(density(100, 2)).toBe(50);
  });

  it('should return 0 density when volume is 0', () => {
    expect(density(100, 0)).toBe(0);
  });

  it('should compute momentum', () => {
    expect(momentum(10, 5)).toBe(50);
  });

  it('should compute acceleration', () => {
    expect(acceleration(20, 4)).toBe(5);
  });

  it('should return 0 acceleration when mass is 0', () => {
    expect(acceleration(20, 0)).toBe(0);
  });
});