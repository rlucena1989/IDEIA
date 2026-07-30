import { createLogger } from '@ideia/logger'
import * as fsp from 'fs/promises'
import * as path from 'path'
import type { CalibrationDataset } from './types'

const log = createLogger('quantization-engine:calibration')

const DEFAULT_DATASETS: CalibrationDataset[] = [
  { name: 'wikitext2', path: '', samples: 128, type: 'text', description: 'WikiText-2 test set — general language modeling' },
  { name: 'c4', path: '', samples: 128, type: 'text', description: 'C4 validation set — web text' },
  { name: 'code_20k', path: '', samples: 128, type: 'code', description: 'Code datasets — programming languages' },
  { name: 'custom_project', path: '', samples: 256, type: 'project', description: 'Project-specific code from IDEIA codebase' },
]

export class CalibrationManager {
  private datasets: Map<string, CalibrationDataset> = new Map()

  constructor() {
    for (const ds of DEFAULT_DATASETS) {
      this.datasets.set(ds.name, ds)
    }
  }

  registerDataset(dataset: CalibrationDataset): void {
    this.datasets.set(dataset.name, dataset)
    log.info('Calibration dataset registered', { name: dataset.name, samples: dataset.samples })
  }

  getDataset(name: string): CalibrationDataset | undefined {
    return this.datasets.get(name)
  }

  listDatasets(): CalibrationDataset[] {
    return Array.from(this.datasets.values())
  }

  async collectProjectSamples(projectRoot: string, maxSamples: number = 256): Promise<CalibrationDataset> {
    const samples: string[] = []
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.py', '.rs', '.go']

    async function walk(dir: string): Promise<void> {
      if (samples.length >= maxSamples) return
      try {
        const entries = await fsp.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (samples.length >= maxSamples) return
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
              await walk(fullPath)
            }
          } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
            try {
              const content = await fsp.readFile(fullPath, 'utf-8')
              samples.push(content.slice(0, 2000))
            } catch { /* skip unreadable files */ }
          }
        }
      } catch { /* skip unreadable dirs */ }
    }

    await walk(projectRoot)

    const outputDir = path.join('.ai', 'calibration')
    await fsp.mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, 'project-samples.jsonl')
    const lines = samples.map(s => JSON.stringify({ text: s })).join('\n')
    await fsp.writeFile(outputPath, lines, 'utf-8')

    const dataset: CalibrationDataset = {
      name: `project-${path.basename(projectRoot)}`,
      path: outputPath,
      samples: samples.length,
      type: 'project',
      description: `Collected from ${projectRoot} (${samples.length} samples)`,
    }

    this.datasets.set(dataset.name, dataset)
    log.info('Project calibration dataset collected', { name: dataset.name, samples: dataset.samples })

    return dataset
  }

  async prepareDataset(datasetName: string, outputPath: string): Promise<string> {
    const dataset = this.datasets.get(datasetName)
    if (!dataset) {
      throw new Error(`Calibration dataset "${datasetName}" not found`)
    }

    if (dataset.path && await fsp.stat(dataset.path).then(s => s.isFile()).catch(() => false)) {
      return dataset.path
    }

    const dataPath = path.join(outputPath, `${datasetName}.jsonl`)
    await fsp.mkdir(path.dirname(dataPath), { recursive: true })

    const content = this.generateMockSamples(dataset.type, dataset.samples)
    await fsp.writeFile(dataPath, content, 'utf-8')

    log.info('Calibration dataset prepared', { name: datasetName, path: dataPath, samples: dataset.samples })
    return dataPath
  }

  private generateMockSamples(type: string, count: number): string {
    const samples: string[] = []
    const texts: Record<string, string[]> = {
      text: [
        'The quick brown fox jumps over the lazy dog. This pangram contains every letter of the English alphabet.',
        'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience.',
        'Natural language processing combines computational linguistics with statistical and deep learning models.',
        'The transformer architecture revolutionized sequence modeling through self-attention mechanisms.',
        'Attention is all you need introduced the transformer model in 2017, replacing recurrent neural networks.',
      ],
      code: [
        'function fibonacci(n: number): number { if (n <= 1) return n; return fibonacci(n - 1) + fibonacci(n - 2); }',
        'interface ModelConfig { name: string; parameters: number; quantization?: string; }',
        'async function loadModel(path: string): Promise<ModelConfig> { const config = await fs.readFile(path, "utf-8"); return JSON.parse(config); }',
        'class QuantizationEngine { private methods: Map<string, QuantMethod> = new Map(); }',
        'export function createOptimizer(): InferenceAutoOptimizer { return new InferenceAutoOptimizer(); }',
      ],
      project: [
        'import { createLogger } from "@ideia/logger"; const log = createLogger("quantization");',
        'export class AgentRuntime { private orchestrator: AgentOrchestrator; }',
        'const config: InferenceEngineConfig = { engine: "vllm", quantization: { weights: "awq", kvCache: "fp8" } };',
        'async function quantizeModel(path: string, method: QuantMethod): Promise<QuantizedModelInfo>',
        'const hw = await detector.detect(); const totalVRAM = hw.gpuDevices.reduce((s, g) => s + g.memoryGb, 0);',
      ],
    }

    const pool = texts[type] || texts.text
    for (let i = 0; i < count; i++) {
      const text = pool[i % pool.length]
      samples.push(JSON.stringify({ text: `${text} Sample ${i + 1}/${count}.` }))
    }

    return samples.join('\n')
  }
}
