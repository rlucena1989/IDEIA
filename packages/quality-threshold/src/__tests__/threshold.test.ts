import { ThresholdAdapter } from '../threshold-adapter'

describe('ThresholdAdapter', () => {
  let adapter: ThresholdAdapter
  beforeEach(() => {
    adapter = new ThresholdAdapter()
    adapter.addConfig({ metric: 'coverage', min: 50, max: 100, initial: 80, adaptationRate: 0.1 })
  })

  it('should record metrics', () => {
    adapter.record({ name: 'coverage', value: 85, weight: 1, threshold: 80, timestamp: '' })
    const result = adapter.adapt('coverage')
    expect(result).toBeNull()
  })

  it('should adapt threshold upward when values are high', () => {
    for (let i = 0; i < 10; i++) adapter.record({ name: 'coverage', value: 95, weight: 1, threshold: 80, timestamp: '' })
    const result = adapter.adapt('coverage')
    expect(result!.newThreshold).toBeGreaterThan(result!.oldThreshold)
  })

  it('should detect drift', () => {
    for (let i = 0; i < 5; i++) adapter.record({ name: 'coverage', value: 80, weight: 1, threshold: 80, timestamp: '' })
    for (let i = 0; i < 5; i++) adapter.record({ name: 'coverage', value: 50, weight: 1, threshold: 80, timestamp: '' })
    const drift = adapter.detectDrift('coverage')
    expect(drift!.driftDetected).toBe(true)
  })
})
