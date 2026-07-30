import fs from 'fs';
import { createLogger } from '@ideia/logger';
import path from 'path';
import { MemoryGraph } from './graph';
import { GraphSnapshotSchema} from './types';
const logger = createLogger('persistence');

export interface GraphPersistence {
  save(graph: MemoryGraph, filePath: string): Promise<void>;
  load(filePath: string): Promise<MemoryGraph | null>;
}

export class JsonPersistence implements GraphPersistence {
  async save(graph: MemoryGraph, filePath: string): Promise<void> {
    const snapshot = (graph as any).exportSnapshot();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  async load(filePath: string): Promise<MemoryGraph | null> {
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const snapshot = GraphSnapshotSchema.parse(raw);
      const graph = new MemoryGraph();
      (graph as any).importSnapshot(snapshot);
      return graph;
    } catch {
      return null;
    }
  }
}

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
}

export class Neo4jPersistence implements GraphPersistence {
  private enabled = false;

  constructor(private config?: Neo4jConfig) {}

  async connect(): Promise<boolean> {
    if (!this.config) return false;
    this.enabled = true;
    return true;
  }

  async save(_graph: MemoryGraph, _filePath?: string): Promise<void> {
    if (!this.enabled) return;
  }

  async load(_filePath?: string): Promise<MemoryGraph | null> {
    if (!this.enabled) return null;
    return null;
  }

  async disconnect(): Promise<void> {
    this.enabled = false;
  }
}

export class CheckpointManager {
  constructor(
    private persistence: GraphPersistence,
    private basePath: string,
  ) {}

  async save(graph: MemoryGraph, name: string): Promise<string> {
    const filePath = path.join(this.basePath, `${name}.graph.json`);
    await this.persistence.save(graph, filePath);
    return filePath;
  }

  async load(name: string): Promise<MemoryGraph | null> {
    const filePath = path.join(this.basePath, `${name}.graph.json`);
    return this.persistence.load(filePath);
  }

  async list(): Promise<string[]> {
    if (!fs.existsSync(this.basePath)) return [];
    return fs.readdirSync(this.basePath)
      .filter(f => f.endsWith('.graph.json'))
      .map(f => f.replace('.graph.json', ''));
  }

  async remove(name: string): Promise<boolean> {
    const filePath = path.join(this.basePath, `${name}.graph.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}