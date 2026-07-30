import { randomUUID } from 'crypto'; import * as fs from 'fs'; import * as path from 'path';
import { createLogger } from '@ideia/logger';
import { DataPipeline, DataSource, Dataset, SeedConfig } from './types';
export class RealData {
  private datasets: Map<string,Dataset> = new Map();
  private pipelines: DataPipeline[] = [];
  registerDataset(name: string, source: DataSource, schema: Record<string,string>, records: number, filePath?: string): Dataset {
    const ds: Dataset = { name, source, records, schema, path: filePath }; this.datasets.set(name, ds); return ds;
  }
  generateSeed(config: SeedConfig): Record<string,unknown>[] {
    const results: Record<string,unknown>[] = [];
    for (let i = 0; i < config.count; i++) {
      const record: Record<string,unknown> = { id: randomUUID() };
      for (const [field, cfg] of Object.entries(config.fields)) {
        record[field] = this.generateValue(cfg.type, cfg.options, cfg.min, cfg.max);
      }
      results.push(record);
    }
    return results;
  }
  generateSeedFile(config: SeedConfig, outputPath: string): string {
    const data = this.generateSeed(config);
    const fullPath = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
    return fullPath;
  }
  registerPipeline(pipeline: DataPipeline): void { this.pipelines.push(pipeline); }
  getPipelines(): DataPipeline[] { return [...this.pipelines]; }
  getDataset(name: string): Dataset | undefined { return this.datasets.get(name); }
  listDatasets(): Dataset[] { return Array.from(this.datasets.values()); }
  private generateValue(type: string, options?: string[], min?: number, max?: number): unknown {
    switch (type) {
      case 'string': return options ? options[Math.floor(Math.random()*options.length)] : `value_${Math.random().toString(36).slice(2,8)}`;
      case 'number': return Math.floor(Math.random() * ((max||100) - (min||0) + 1)) + (min||0);
      case 'boolean': return Math.random() > 0.5;
      case 'email': return `user${Math.floor(Math.random()*1000)}@example.com`;
      case 'date': return new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().slice(0,10);
      default: return `generated_${type}`;
    }
  }
}
export function createRealData(): RealData { return new RealData(); }
