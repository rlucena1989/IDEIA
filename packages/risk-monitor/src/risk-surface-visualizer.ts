import { type RiskSurface } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('risk-surface-visualizer');

export interface AgentRiskPoint {
  agentId: string
  actionType: string
  x: number
  y: number
  riskScore: number
  trend: 'increasing' | 'stable' | 'decreasing'
  alertCount: number
}

export interface SurfaceConfig {
  gridSize: number
  blurRadius: number
  colorLow: [number, number, number]
  colorHigh: [number, number, number]
  thresholdLines: number[]
  animationFps: number
}

export class RiskSurfaceVisualizer {
  private _points: AgentRiskPoint[] = []
  private _config: SurfaceConfig

  constructor(config?: Partial<SurfaceConfig>) {
    this._config = {
      gridSize: 64,
      blurRadius: 0.1,
      colorLow: [0, 0.5, 1],
      colorHigh: [1, 0, 0],
      thresholdLines: [0.3, 0.6, 0.8],
      animationFps: 30,
      ...config,
    }
  }

  updateData(points: AgentRiskPoint[]): void {
    this._points = points
  }

  addPoint(point: AgentRiskPoint): void {
    this._points.push(point)
    if (this._points.length > 10000) {
      this._points = this._points.slice(-5000)
    }
  }

  getPoints(): AgentRiskPoint[] {
    return [...this._points]
  }

  getPointCount(): number {
    return this._points.length
  }

  generateMesh(): RiskSurface {
    const grid = this._interpolateGrid()
    const gridSize = this._config.gridSize
    const vertexCount = gridSize * gridSize
    const vertices = new Float64Array(vertexCount * 3)
    const colors = new Float32Array(vertexCount * 4)
    const normals = new Float32Array(vertexCount * 3)

    let idx = 0
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const z = grid[y * gridSize + x]

        vertices[idx * 3] = x / gridSize
        vertices[idx * 3 + 1] = y / gridSize
        vertices[idx * 3 + 2] = z

        const color = this._riskToColor(z)
        colors[idx * 4] = color[0]
        colors[idx * 4 + 1] = color[1]
        colors[idx * 4 + 2] = color[2]
        colors[idx * 4 + 3] = 1

        normals[idx * 3] = 0
        normals[idx * 3 + 1] = 0
        normals[idx * 3 + 2] = 1

        idx++
      }
    }

    const indices: number[] = []
    for (let y = 0; y < gridSize - 1; y++) {
      for (let x = 0; x < gridSize - 1; x++) {
        const tl = y * gridSize + x
        const tr = y * gridSize + x + 1
        const bl = (y + 1) * gridSize + x
        const br = (y + 1) * gridSize + x + 1
        indices.push(tl, tr, bl, tr, br, bl)
      }
    }

    return {
      gridSize,
      vertices,
      colors,
      indices: new Uint32Array(indices),
      normals,
    }
  }

  getSurfaceStatistics(): { minRisk: number; maxRisk: number; avgRisk: number; pointCount: number } {
    if (this._points.length === 0) {
      return { minRisk: 0, maxRisk: 0, avgRisk: 0, pointCount: 0 }
    }
    const scores = this._points.map(p => p.riskScore)
    const minRisk = Math.min(...scores)
    const maxRisk = Math.max(...scores)
    const avgRisk = scores.reduce((s, v) => s + v, 0) / scores.length
    return { minRisk, maxRisk, avgRisk, pointCount: this._points.length }
  }

  getHeatmapGrid(): Float64Array {
    return this._interpolateGrid()
  }

  private _interpolateGrid(): Float64Array {
    const gridSize = this._config.gridSize
    const grid = new Float64Array(gridSize * gridSize).fill(0)

    if (this._points.length === 0) return grid

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let totalWeight = 0
        let weightedRisk = 0

        const cx = gx / gridSize
        const cy = gy / gridSize

        for (const point of this._points) {
          const dx = cx - point.x
          const dy = cy - point.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const weight = Math.exp(-(dist * dist) / (2 * this._config.blurRadius * this._config.blurRadius))
          weightedRisk += point.riskScore * weight
          totalWeight += weight
        }

        grid[gy * gridSize + gx] = totalWeight > 0 ? weightedRisk / totalWeight : 0
      }
    }

    return grid
  }

  private _riskToColor(risk: number): [number, number, number] {
    const t = Math.max(0, Math.min(1, risk))
    const [lr, lg, lb] = this._config.colorLow
    const [hr, hg, hb] = this._config.colorHigh
    return [
      lr + (hr - lr) * t,
      lg + (hg - lg) * t,
      lb + (hb - lb) * t,
    ]
  }
}
