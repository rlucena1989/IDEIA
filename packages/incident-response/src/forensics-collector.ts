import { createHash } from 'crypto';
import { Logger, createLogger } from '@ideia/logger';
import type { ForensicEvidence, EvidenceType, ChainOfCustodyEntry } from './types';

interface ActionRecord {
  type: string;
  timestamp: number;
  payload: string;
}

interface FileSnapshot {
  path: string;
  change: 'create' | 'modify' | 'delete';
  timestamp: number;
  content?: string;
}

interface NetworkLog {
  destination: string;
  port: number;
  protocol: string;
  timestamp: number;
  bytes: number;
}

interface ProcessSnapshot {
  pid: number;
  name: string;
  cmdline: string;
  user: string;
  memoryBytes: number;
}

interface RegistrySnapshot {
  key: string;
  value: string;
  data: string;
  timestamp: number;
}

export type ForensicsDepth = 'partial' | 'full' | 'complete';

export interface ForensicsReport {
  agentId: string;
  timestamp: number;
  depth: ForensicsDepth;
  memoryDumps: MemoryDump[];
  networkLogs: NetworkLog[];
  fileSnapshots: FileSnapshot[];
  processList: ProcessSnapshot[];
  registrySnapshots: RegistrySnapshot[];
  recentActions: ActionRecord[];
  auditChainHash: string;
  evidenceHash: string;
  chainOfCustody: ChainOfCustodyEntry[];
}

interface MemoryDump {
  pid: number;
  processName: string;
  sizeBytes: number;
  hash: string;
  timestamp: number;
}

export class ForensicsCollector {
  private _previousHash: string = '';
  private readonly _logger: Logger;

  constructor(logger?: Logger) {
    this._logger = logger || createLogger('incident-response');
  }

  async capture(agentId: string, depth: ForensicsDepth = 'full'): Promise<ForensicsReport> {
    const startTime = Date.now();
    this._logger.info(`Starting forensics capture for agent ${agentId} at depth ${depth}`);

    const windowMs = depth === 'partial' ? 3600000 : depth === 'full' ? 86400000 : 259200000;
    const maxEntries = depth === 'partial' ? 20 : depth === 'full' ? 100 : 500;

    const [
      memoryDumps,
      networkLogs,
      fileSnapshots,
      processList,
      registrySnapshots,
      recentActions,
    ] = await Promise.all([
      this._captureMemoryDumps(agentId, depth),
      this._captureNetworkLogs(agentId, windowMs),
      this._captureFileSnapshots(agentId, windowMs),
      this._snapshotProcesses(agentId),
      this._snapshotRegistry(agentId),
      this._getRecentActions(agentId, windowMs, maxEntries),
    ]);

    const report: Omit<ForensicsReport, 'auditChainHash' | 'evidenceHash' | 'chainOfCustody'> = {
      agentId,
      timestamp: Date.now(),
      depth,
      memoryDumps,
      networkLogs,
      fileSnapshots,
      processList,
      registrySnapshots,
      recentActions,
    };

    return this._finalizeReport(report);
  }

  async captureEvidence(
    agentId: string,
    evidenceType: EvidenceType,
    depth: ForensicsDepth = 'full'
  ): Promise<ForensicEvidence> {
    const timestamp = Date.now();
    let data: string;
    let size: number;

    switch (evidenceType) {
      case 'memory_dump': {
        const dumps = await this._captureMemoryDumps(agentId, depth);
        data = JSON.stringify(dumps);
        size = data.length;
        break;
      }
      case 'network_capture': {
        const logs = await this._captureNetworkLogs(agentId, depth === 'partial' ? 3600000 : 86400000);
        data = JSON.stringify(logs);
        size = data.length;
        break;
      }
      case 'file_snapshot': {
        const files = await this._captureFileSnapshots(agentId, depth === 'partial' ? 3600000 : 86400000);
        data = JSON.stringify(files);
        size = data.length;
        break;
      }
      case 'process_list': {
        const procs = await this._snapshotProcesses(agentId);
        data = JSON.stringify(procs);
        size = data.length;
        break;
      }
      case 'registry_snapshot': {
        const reg = await this._snapshotRegistry(agentId);
        data = JSON.stringify(reg);
        size = data.length;
        break;
      }
      case 'disk_image':
      case 'log_file': {
        data = `Simulated ${evidenceType} for ${agentId}`;
        size = data.length;
        break;
      }
    }

    const hash = this._sha256(data);
    const chainOfCustody: ChainOfCustodyEntry[] = [
      {
        timestamp,
        handler: 'ForensicsCollector',
        action: 'collected',
        hash,
      },
    ];

    return {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      agentId,
      type: evidenceType,
      timestamp,
      hash,
      size,
      path: `/forensics/${agentId}/${evidenceType}/${timestamp}`,
      chainOfCustody,
      metadata: {
        depth,
        collector: 'ForensicsCollector',
      },
    };
  }

  async verifyEvidence(evidence: ForensicEvidence): Promise<boolean> {
    if (evidence.chainOfCustody.length === 0) return false;
    const lastEntry = evidence.chainOfCustody[evidence.chainOfCustody.length - 1];
    return lastEntry.hash === evidence.hash;
  }

  async verifyChain(report: ForensicsReport): Promise<boolean> {
    const content = JSON.stringify({
      agentId: report.agentId,
      timestamp: report.timestamp,
      depth: report.depth,
      memoryDumps: report.memoryDumps,
      networkLogs: report.networkLogs,
      fileSnapshots: report.fileSnapshots,
      processList: report.processList,
      registrySnapshots: report.registrySnapshots,
      recentActions: report.recentActions,
    });
    const computedHash = this._sha256(content);
    const chainValid = computedHash === report.evidenceHash;
    if (!chainValid) return false;
    for (let i = 1; i < report.chainOfCustody.length; i++) {
      if (!report.chainOfCustody[i].hash) return false;
    }
    return true;
  }

  private _finalizeReport(
    report: Omit<ForensicsReport, 'auditChainHash' | 'evidenceHash' | 'chainOfCustody'>
  ): ForensicsReport {
    const content = JSON.stringify(report);
    const evidenceHash = this._sha256(content);
    const chainOfCustody: ChainOfCustodyEntry[] = [
      {
        timestamp: Date.now(),
        handler: 'ForensicsCollector',
        action: 'collected',
        hash: evidenceHash,
      },
    ];
    const auditChainHash = this._previousHash || evidenceHash;
    this._previousHash = evidenceHash;

    return { ...report, auditChainHash, evidenceHash, chainOfCustody };
  }

  private _sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private async _captureMemoryDumps(_agentId: string, depth: ForensicsDepth): Promise<MemoryDump[]> {
    const count = depth === 'partial' ? 1 : depth === 'full' ? 3 : 10;
    const dumps: MemoryDump[] = [];
    for (let i = 0; i < count; i++) {
      const pid = 1000 + i;
      const sizeBytes = Math.floor(Math.random() * 1024 * 1024 * 100);
      dumps.push({
        pid,
        processName: `process_${pid}`,
        sizeBytes,
        hash: this._sha256(`memory_${_agentId}_${pid}_${Date.now()}`),
        timestamp: Date.now() - i * 60000,
      });
    }
    return dumps;
  }

  private async _captureNetworkLogs(_agentId: string, _windowMs: number): Promise<NetworkLog[]> {
    return [
      { destination: '192.168.1.100', port: 443, protocol: 'HTTPS', timestamp: Date.now() - 300000, bytes: 1024 },
      { destination: '10.0.0.50', port: 22, protocol: 'SSH', timestamp: Date.now() - 600000, bytes: 5120 },
    ];
  }

  private async _captureFileSnapshots(_agentId: string, _windowMs: number): Promise<FileSnapshot[]> {
    return [
      { path: `/home/${_agentId}/data/output.txt`, change: 'modify', timestamp: Date.now() - 120000 },
      { path: `/home/${_agentId}/config/settings.json`, change: 'modify', timestamp: Date.now() - 300000 },
    ];
  }

  private async _snapshotProcesses(_agentId: string): Promise<ProcessSnapshot[]> {
    return [
      { pid: 1001, name: 'node', cmdline: 'node index.js', user: 'agent', memoryBytes: 256 * 1024 * 1024 },
      { pid: 1002, name: 'python3', cmdline: 'python3 analyze.py', user: 'agent', memoryBytes: 128 * 1024 * 1024 },
    ];
  }

  private async _snapshotRegistry(_agentId: string): Promise<RegistrySnapshot[]> {
    return [
      { key: 'HKLM\\Software\\IDEIA\\Agents', value: 'Status', data: 'active', timestamp: Date.now() - 3600000 },
    ];
  }

  private async _getRecentActions(
    _agentId: string,
    _windowMs: number,
    _maxEntries: number
  ): Promise<ActionRecord[]> {
    return [
      { type: 'file:write', timestamp: Date.now() - 60000, payload: '/tmp/exploit.sh' },
      { type: 'network:connect', timestamp: Date.now() - 120000, payload: '192.168.1.100:443' },
    ];
  }
}
