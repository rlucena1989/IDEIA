import { NatsConnectionManager } from './nats-connection';
import { createLogger } from '@ideia/logger';

const log = createLogger('consumer-group-manager');

export interface ConsumerGroupConfig {
  name: string;
  streamName: string;
  durableName?: string;
  ackPolicy?: 'explicit' | 'none' | 'all';
  maxDeliver?: number;
  ackWait?: number;
  replayPolicy?: 'instant' | 'original';
}

export interface ConsumerMember {
  id: string;
  groupId: string;
  lastActive: number;
  processedCount: number;
}

export class ConsumerGroup {
  private config: ConsumerGroupConfig;
  private members: Map<string, ConsumerMember> = new Map();

  constructor(config: ConsumerGroupConfig) {
    this.config = {
      ackPolicy: 'explicit',
      maxDeliver: 3,
      ackWait: 30000,
      replayPolicy: 'instant',
      ...config,
    };
  }

  addMember(memberId: string): void {
    if (!this.members.has(memberId)) {
      this.members.set(memberId, {
        id: memberId,
        groupId: this.config.name,
        lastActive: Date.now(),
        processedCount: 0,
      });
      log.info(`Added member: ${memberId} to group ${this.config.name}`);
    }
  }

  removeMember(memberId: string): void {
    this.members.delete(memberId);
    log.info(`Removed member: ${memberId} from group ${this.config.name}`);
  }

  updateMemberActivity(memberId: string): void {
    const member = this.members.get(memberId);
    if (member) {
      member.lastActive = Date.now();
    }
  }

  incrementProcessedCount(memberId: string): void {
    const member = this.members.get(memberId);
    if (member) {
      member.processedCount++;
    }
  }

  getMembers(): ConsumerMember[] {
    return Array.from(this.members.values());
  }

  getMemberCount(): number {
    return this.members.size;
  }

  getInactiveMembers(inactiveThresholdMs: number = 60000): ConsumerMember[] {
    const now = Date.now();
    return this.getMembers().filter(m => (now - m.lastActive) > inactiveThresholdMs);
  }

  getConfig(): ConsumerGroupConfig {
    return { ...this.config };
  }
}

export class ConsumerGroupManager {
  private connectionManager: NatsConnectionManager;
  private groups: Map<string, ConsumerGroup> = new Map();

  constructor(connectionManager: NatsConnectionManager) {
    this.connectionManager = connectionManager;
  }

  async initialize(): Promise<void> {
    try {
      await this.connectionManager.connect();
    } catch (_err) {
      log.info(`Initialized (offline mode): ${_err}`);
      return;
    }
    log.info('Initialized');
  }

  async createGroup(config: ConsumerGroupConfig): Promise<ConsumerGroup> {
    if (this.groups.has(config.name)) {
      throw new Error(`Consumer group ${config.name} already exists`);
    }

    const group = new ConsumerGroup(config);
    this.groups.set(config.name, group);
    
    log.info(`Created consumer group: ${config.name}`);
    return group;
  }

  getGroup(name: string): ConsumerGroup | undefined {
    return this.groups.get(name);
  }

  async deleteGroup(name: string): Promise<void> {
    this.groups.delete(name);
    log.info(`Deleted consumer group: ${name}`);
  }

  listGroups(): string[] {
    return Array.from(this.groups.keys());
  }

  async cleanupInactiveMembers(inactiveThresholdMs: number = 60000): Promise<void> {
    for (const group of this.groups.values()) {
      const inactiveMembers = group.getInactiveMembers(inactiveThresholdMs);
      for (const member of inactiveMembers) {
        group.removeMember(member.id);
        log.info(`Removed inactive member ${member.id} from group ${group.getConfig().name}`);
      }
    }
  }

  getStats(): Array<{ groupName: string; memberCount: number; totalProcessed: number }> {
    return Array.from(this.groups.values()).map(group => {
      const members = group.getMembers();
      const totalProcessed = members.reduce((sum, m) => sum + m.processedCount, 0);
      return { groupName: group.getConfig().name, memberCount: members.length, totalProcessed };
    });
  }
}

export function createConsumerGroupManager(connectionManager: NatsConnectionManager): ConsumerGroupManager {
  return new ConsumerGroupManager(connectionManager);
}
