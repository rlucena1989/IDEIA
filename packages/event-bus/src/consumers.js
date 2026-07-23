"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsumerGroupManager = exports.ConsumerGroup = void 0;
exports.createConsumerGroupManager = createConsumerGroupManager;
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('consumer-group-manager');
class ConsumerGroup {
    config;
    members = new Map();
    constructor(config) {
        this.config = {
            ackPolicy: 'explicit',
            maxDeliver: 3,
            ackWait: 30000,
            replayPolicy: 'instant',
            ...config,
        };
    }
    addMember(memberId) {
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
    removeMember(memberId) {
        this.members.delete(memberId);
        log.info(`Removed member: ${memberId} from group ${this.config.name}`);
    }
    updateMemberActivity(memberId) {
        const member = this.members.get(memberId);
        if (member) {
            member.lastActive = Date.now();
        }
    }
    incrementProcessedCount(memberId) {
        const member = this.members.get(memberId);
        if (member) {
            member.processedCount++;
        }
    }
    getMembers() {
        return Array.from(this.members.values());
    }
    getMemberCount() {
        return this.members.size;
    }
    getInactiveMembers(inactiveThresholdMs = 60000) {
        const now = Date.now();
        return this.getMembers().filter(m => (now - m.lastActive) > inactiveThresholdMs);
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.ConsumerGroup = ConsumerGroup;
class ConsumerGroupManager {
    connectionManager;
    groups = new Map();
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
    }
    async initialize() {
        try {
            await this.connectionManager.connect();
        }
        catch (err) {
            log.info(`Initialized (offline mode): ${err}`);
            return;
        }
        log.info('Initialized');
    }
    async createGroup(config) {
        if (this.groups.has(config.name)) {
            throw new Error(`Consumer group ${config.name} already exists`);
        }
        const group = new ConsumerGroup(config);
        this.groups.set(config.name, group);
        log.info(`Created consumer group: ${config.name}`);
        return group;
    }
    getGroup(name) {
        return this.groups.get(name);
    }
    async deleteGroup(name) {
        this.groups.delete(name);
        log.info(`Deleted consumer group: ${name}`);
    }
    listGroups() {
        return Array.from(this.groups.keys());
    }
    async cleanupInactiveMembers(inactiveThresholdMs = 60000) {
        for (const group of this.groups.values()) {
            const inactiveMembers = group.getInactiveMembers(inactiveThresholdMs);
            for (const member of inactiveMembers) {
                group.removeMember(member.id);
                log.info(`Removed inactive member ${member.id} from group ${group.getConfig().name}`);
            }
        }
    }
    getStats() {
        return Array.from(this.groups.values()).map(group => {
            const members = group.getMembers();
            const totalProcessed = members.reduce((sum, m) => sum + m.processedCount, 0);
            return { groupName: group.getConfig().name, memberCount: members.length, totalProcessed };
        });
    }
}
exports.ConsumerGroupManager = ConsumerGroupManager;
function createConsumerGroupManager(connectionManager) {
    return new ConsumerGroupManager(connectionManager);
}
//# sourceMappingURL=consumers.js.map