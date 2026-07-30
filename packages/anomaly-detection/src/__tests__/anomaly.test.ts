import { AnomalyDetector } from '../anomaly-detector'

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector
  beforeEach(() => { detector = new AnomalyDetector({ method: 'zscore', threshold: 2, minDataPoints: 5 }) })

  it('should not detect anomalies with few points', () => {
    detector.addPoints([{ timestamp: '1', value: 10 }, { timestamp: '2', value: 11 }])
    expect(detector.detect().length).toBe(0)
  })

  it('should detect spike anomaly using zscore', () => {
    for (let i = 0; i < 10; i++) detector.addPoint({ timestamp: `${i}`, value: 10 })
    detector.addPoint({ timestamp: '10', value: 100 })
    const results = detector.detect()
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('spike')
    expect(results[0].actualValue).toBe(100)
  })

  it('should detect using MAD method', () => {
    const madDetector = new AnomalyDetector({ method: 'mad', threshold: 2, minDataPoints: 5 })
    for (let i = 0; i < 10; i++) madDetector.addPoint({ timestamp: `${i}`, value: 10 + (i % 3) })
    madDetector.addPoint({ timestamp: '10', value: 50 })
    const results = madDetector.detect()
    expect(results.length).toBeGreaterThan(0)
  })

  it('should detect using IQR method', () => {
    const iqrDetector = new AnomalyDetector({ method: 'iqr', threshold: 1.5, minDataPoints: 5 })
    for (let i = 0; i < 10; i++) iqrDetector.addPoint({ timestamp: `${i}`, value: 10 })
    iqrDetector.addPoint({ timestamp: '10', value: 100 })
    const results = iqrDetector.detect()
    expect(results.length).toBeGreaterThan(0)
  })

  it('should detect using EWMA method', () => {
    const ewmaDetector = new AnomalyDetector({ method: 'ewma', threshold: 2, minDataPoints: 5 })
    for (let i = 0; i < 10; i++) ewmaDetector.addPoint({ timestamp: `${i}`, value: 10 })
    ewmaDetector.addPoint({ timestamp: '10', value: 30 })
    const results = ewmaDetector.detect()
    expect(results.length).toBeGreaterThan(0)
  })

  it('should generate detection report', () => {
    for (let i = 0; i < 8; i++) detector.addPoint({ timestamp: `${i}`, value: 5 })
    detector.addPoint({ timestamp: '9', value: 50 })
    const report = detector.generateReport('2026-07')
    expect(report.anomaliesFound).toBeGreaterThan(0)
    expect(report.totalPoints).toBe(9)
    expect(report.recommendations.length).toBeGreaterThan(0)
  })
})
