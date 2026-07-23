const G = 9.80665;

export function force(mass: number, acceleration: number): number {
  return mass * acceleration;
}

export function kineticEnergy(mass: number, velocity: number): number {
  return 0.5 * mass * velocity * velocity;
}

export function potentialEnergy(mass: number, height: number): number {
  return mass * G * height;
}

export function power(work: number, time: number): number {
  if (time === 0) return 0;
  return work / time;
}

export function velocityFromEnergy(kineticEnergy: number, mass: number): number {
  if (mass === 0) return 0;
  return Math.sqrt(2 * kineticEnergy / mass);
}

export function density(mass: number, volume: number): number {
  if (volume === 0) return 0;
  return mass / volume;
}

export function momentum(mass: number, velocity: number): number {
  return mass * velocity;
}

export function acceleration(force: number, mass: number): number {
  if (mass === 0) return 0;
  return force / mass;
}
