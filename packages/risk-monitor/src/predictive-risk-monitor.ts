import { type ForecastConfig, type ForecastPoint, type ForecastResult, type ProphetModel } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('predictive-risk-monitor');

export class PredictiveRiskMonitor {
  private _config: ForecastConfig
  private _history: Array<{ timestamp: number; risk: number }> = []
  private _fitted = false
  private _params: ProphetModel

  constructor(config?: Partial<ForecastConfig>) {
    this._config = {
      horizon: 7,
      steps: 24,
      seasonalityMode: 'additive',
      weeklySeasonality: true,
      dailySeasonality: true,
      changepointPriorScale: 0.05,
      seasonalityPriorScale: 10,
      ...config,
    }

    this._params = {
      trend: [0, 0],
      seasonalityWeekly: [],
      seasonalityDaily: [],
      holiday: new Map(),
      sigma: 0.1,
    }
  }

  get config(): ForecastConfig {
    return { ...this._config }
  }

  get history(): Array<{ timestamp: number; risk: number }> {
    return [...this._history]
  }

  get fitted(): boolean {
    return this._fitted
  }

  async addObservation(timestamp: number, risk: number): Promise<void> {
    this._history.push({ timestamp, risk })
    if (this._history.length > 10000) {
      this._history = this._history.slice(-5000)
    }
  }

  async fit(): Promise<void> {
    if (this._history.length < 14) {
      throw new Error('Need at least 14 observations to fit Prophet model')
    }

    const y = this._history.map(h => h.risk)
    const t = this._history.map(h => this._normalizeTime(h.timestamp))

    this._fitTrend(t, y)
    this._fitSeasonality(t, y)
    this._estimateUncertainty(y)

    this._fitted = true
  }

  async predict(): Promise<ForecastResult> {
    if (!this._fitted) {
      await this.fit()
    }

    const lastTime = this._history.length > 0
      ? this._normalizeTime(this._history[this._history.length - 1].timestamp)
      : 0
    const stepSize = this._config.horizon / (this._config.steps * 24)

    const forecast: ForecastPoint[] = []
    const changePoints: number[] = []

    for (let i = 1; i <= this._config.steps; i++) {
      const t = lastTime + i * stepSize
      const trend = this._params.trend[0] + this._params.trend[1] * t
      const weekly = this._computeSeasonality(t, this._params.seasonalityWeekly, 7)
      const daily = this._computeSeasonality(t, this._params.seasonalityDaily, 24)
      const holiday = 0

      const yhat = trend + weekly + daily + holiday
      const uncertainty = this._params.sigma * (1 + t * 0.01)
      const yhatLower = yhat - 1.28 * uncertainty
      const yhatUpper = yhat + 1.28 * uncertainty

      forecast.push({
        ds: Date.now() + i * stepSize * 86400000,
        yhat,
        yhatLower,
        yhatUpper,
        trend,
        weekly,
        daily,
        holiday,
        changepoint: false,
      })

      if (i > 1) {
        const prev = forecast[i - 2]
        if (prev.yhat !== 0 && Math.abs(yhat - prev.yhat) / prev.yhat > 0.5) {
          changePoints.push(forecast[i - 1].ds)
          forecast[i - 1] = { ...forecast[i - 1], changepoint: true }
        }
      }
    }

    const trendDirection = this._params.trend[1] > 0.001
      ? 'up' as const
      : this._params.trend[1] < -0.001
        ? 'down' as const
        : 'stable' as const

    let nextPeak: ForecastPoint | null = null
    for (const p of forecast) {
      if (nextPeak === null || p.yhat > nextPeak.yhat) {
        nextPeak = p
      }
    }

    const lastRisk = this._history.length > 0 ? this._history[this._history.length - 1].risk : 0.5
    const avgForecast = forecast.reduce((s, p) => s + p.yhat, 0) / forecast.length
    let alertRecommendation: string
    if (avgForecast > lastRisk * 1.3) {
      alertRecommendation = 'ALERT: Predicted risk increase of >30% in forecast horizon. Consider preemptive mitigation.'
    } else if (avgForecast < lastRisk * 0.7) {
      alertRecommendation = 'INFO: Risk expected to decrease. Monitor for confirmation.'
    } else {
      alertRecommendation = 'OK: Risk within expected range. Continue normal monitoring.'
    }

    return {
      forecast,
      changePoints,
      seasonality: {
        weekly: this._computeSeasonalityCurve(this._params.seasonalityWeekly, 7, 24),
        daily: this._computeSeasonalityCurve(this._params.seasonalityDaily, 24, 24),
      },
      trendDirection,
      nextPeak,
      alertRecommendation,
    }
  }

  getForecastAccuracy(): { mae: number; rmse: number; mape: number } {
    if (this._history.length < 2) return { mae: 0, rmse: 0, mape: 0 }

    const errors = this._history.slice(1).map((h, i) => {
      const p = this._params.trend[0] + this._params.trend[1] * this._normalizeTime(h.timestamp)
      return Math.abs(h.risk - p)
    })

    const mae = errors.reduce((a, b) => a + b, 0) / errors.length
    const rmse = Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length)
    const mape = errors.reduce((a, b, i) => a + b / (this._history[i + 1].risk || 0.01), 0) / errors.length

    return { mae, rmse, mape }
  }

  private _fitTrend(t: number[], y: number[]): void {
    const n = t.length
    const nChangepoints = Math.min(25, Math.floor(n / 2))
    const changepoints = this._selectChangepoints(t, nChangepoints)

    const A = Array.from({ length: n }, (_, i) => {
      const row = [1, t[i]]
      for (const cp of changepoints) {
        row.push(Math.max(0, t[i] - cp))
      }
      return row
    })

    const At = this._transpose(A)
    const AtA = this._matMul(At, A)
    const diagonal = AtA.map((row, i) => row.map((v, j) => i === j ? v + 1 / this._config.changepointPriorScale : v))
    const inv = this._invert(diagonal)
    const AtY = At.map(row => row.reduce((s, v, i) => s + v * y[i], 0))
    const beta = AtY.map((v, i) => inv[i].reduce((s, w, j) => s + w * AtY[j], 0))

    this._params.trend = [beta[0], beta[1]]
  }

  private _selectChangepoints(t: number[], n: number): number[] {
    const sorted = [...t].sort((a, b) => a - b)
    const step = Math.floor(sorted.length / (n + 1))
    const points: number[] = []
    for (let i = 1; i <= n; i++) {
      points.push(sorted[i * step])
    }
    return points
  }

  private _fitSeasonality(t: number[], y: number[]): void {
    if (this._config.weeklySeasonality) {
      const nFourier = 3
      const X = t.map(ti => {
        const row: number[] = []
        for (let j = 1; j <= nFourier; j++) {
          row.push(Math.sin(2 * Math.PI * j * ti * 7))
          row.push(Math.cos(2 * Math.PI * j * ti * 7))
        }
        return row
      })

      const yMean = y.reduce((a, b) => a + b, 0) / y.length
      const yCentered = y.map(v => v - yMean)
      const beta = this._ridgeRegression(X, yCentered, 1 / this._config.seasonalityPriorScale)
      this._params.seasonalityWeekly = beta
    }

    if (this._config.dailySeasonality) {
      const nFourier = 6
      const X = t.map(ti => {
        const row: number[] = []
        for (let j = 1; j <= nFourier; j++) {
          row.push(Math.sin(2 * Math.PI * j * ti))
          row.push(Math.cos(2 * Math.PI * j * ti))
        }
        return row
      })

      const yMean = y.reduce((a, b) => a + b, 0) / y.length
      const yCentered = y.map(v => v - yMean)
      const beta = this._ridgeRegression(X, yCentered, 1 / this._config.seasonalityPriorScale)
      this._params.seasonalityDaily = beta
    }
  }

  private _ridgeRegression(X: number[][], y: number[], lambda: number): number[] {
    const n = X.length
    const p = X[0].length
    const XtX = Array.from({ length: p }, () => new Array(p).fill(0))
    const XtY = new Array(p).fill(0)

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        XtY[j] += X[i][j] * y[i]
        for (let k = 0; k < p; k++) {
          XtX[j][k] += X[i][j] * X[i][k]
        }
      }
    }

    for (let j = 0; j < p; j++) {
      XtX[j][j] += lambda
    }

    const inv = this._invert(XtX)
    return XtY.map((v, i) => inv[i].reduce((s, w, j) => s + w * XtY[j], 0))
  }

  private _estimateUncertainty(y: number[]): void {
    const mean = y.reduce((a, b) => a + b, 0) / y.length
    const variance = y.reduce((s, v) => s + (v - mean) ** 2, 0) / y.length
    this._params.sigma = Math.sqrt(variance)
  }

  private _computeSeasonality(t: number, beta: number[], period: number): number {
    if (beta.length === 0) return 0
    const nFourier = Math.floor(beta.length / 2)
    let result = 0
    for (let j = 0; j < nFourier; j++) {
      const angle = 2 * Math.PI * (j + 1) * t / period
      result += beta[2 * j] * Math.sin(angle) + beta[2 * j + 1] * Math.cos(angle)
    }
    return result
  }

  private _computeSeasonalityCurve(beta: number[], period: number, points: number): number[] {
    const curve: number[] = []
    for (let i = 0; i < points; i++) {
      const t = (i / points) * period
      curve.push(this._computeSeasonality(t, beta, period))
    }
    return curve
  }

  private _normalizeTime(timestamp: number): number {
    const first = this._history.length > 0 ? this._history[0].timestamp : timestamp
    return (timestamp - first) / 86400000
  }

  private _transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map(row => row[i]))
  }

  private _matMul(A: number[][], B: number[][]): number[][] {
    return A.map(row => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)))
  }

  private _invert(matrix: number[][]): number[][] {
    const n = matrix.length
    const augmented = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)])

    for (let col = 0; col < n; col++) {
      let maxRow = col
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) maxRow = row
      }
      const temp = augmented[col]
      augmented[col] = augmented[maxRow]
      augmented[maxRow] = temp

      const pivot = augmented[col][col]
      if (Math.abs(pivot) < 1e-10) continue

      for (let j = 0; j < 2 * n; j++) augmented[col][j] /= pivot

      for (let row = 0; row < n; row++) {
        if (row === col) continue
        const factor = augmented[row][col]
        for (let j = 0; j < 2 * n; j++) augmented[row][j] -= factor * augmented[col][j]
      }
    }

    return augmented.map(row => row.slice(n))
  }
}
