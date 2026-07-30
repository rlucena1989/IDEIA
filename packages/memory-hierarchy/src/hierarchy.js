"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryHierarchy = void 0;
const logger_1 = require("@ideia/logger");
const working_memory_1 = require("./working-memory");
const project_memory_1 = require("./project-memory");
const institutional_memory_1 = require("./institutional-memory");
const global_memory_1 = require("./global-memory");
const curator_1 = require("./curator");
const logger = (0, logger_1.createLogger)('hierarchy');
class MemoryHierarchy {
    working;
    project;
    institutional;
    global;
    curator;
    constructor() {
        this.working = new working_memory_1.WorkingMemory();
        this.project = new project_memory_1.ProjectMemory();
        this.institutional = new institutional_memory_1.InstitutionalMemory();
        this.global = new global_memory_1.GlobalMemory();
        this.curator = new curator_1.MemoryCurator(this.working, this.project, this.institutional, this.global);
    }
    store(content, category, source, level, tags) {
        const targetLevel = level ?? this.inferLevel(category);
        switch (targetLevel) {
            case 'working':
                return this.working.store(content, category, source, tags);
            case 'project':
                return this.project.store(content, category, source, tags);
            case 'institutional':
                return this.institutional.storePolicy(source, content, tags);
            case 'global':
                return this.global.storePattern(source, content, tags);
        }
    }
    search(query, level, category) {
        const results = [];
        const levels = level ? [level] : ['working', 'project', 'institutional', 'global'];
        for (const l of levels) {
            const entries = this.searchLevel(l, query, category);
            results.push(...entries);
        }
        return results;
    }
    searchLevel(level, query, category) {
        switch (level) {
            case 'working': return this.working.search(query);
            case 'project': return this.project.search(query, category);
            case 'institutional': return this.institutional.search(query, category);
            case 'global': return this.global.search(query, category);
        }
    }
    getSummary() {
        return [
            this.buildSummary('working', this.working),
            this.buildSummary('project', this.project),
            this.buildSummary('institutional', this.institutional),
            this.buildSummary('global', this.global),
        ];
    }
    get(id, level) {
        if (!level || level === 'working') {
            const entry = this.working.get(id);
            if (entry)
                return entry;
        }
        if (!level || level === 'project') {
            const entry = this.project.get(id);
            if (entry)
                return entry;
        }
        if (!level || level === 'institutional') {
            const entry = this.institutional.getPolicy(id);
            if (entry)
                return entry;
        }
        if (!level || level === 'global') {
            const entry = this.global.findByTag(id)[0];
            if (entry)
                return entry;
        }
        return undefined;
    }
    inferLevel(category) {
        if (['error', 'observation', 'event'].includes(category))
            return 'working';
        if (['decision', 'preference', 'architecture'].includes(category))
            return 'project';
        if (['policy'].includes(category))
            return 'institutional';
        return 'project';
    }
    buildSummary(level, store) {
        const entries = store.getAll();
        const _now = Date.now();
        let oldest = null;
        let newest = null;
        for (const e of entries) {
            if (!oldest || e.createdAt < oldest)
                oldest = e.createdAt;
            if (!newest || e.createdAt > newest)
                newest = e.createdAt;
        }
        return {
            level,
            totalEntries: store.size,
            activeEntries: entries.filter(e => e.status === 'active').length,
            archivedEntries: entries.filter(e => e.status === 'archived').length,
            oldestEntry: oldest,
            newestEntry: newest,
        };
    }
}
exports.MemoryHierarchy = MemoryHierarchy;
//# sourceMappingURL=hierarchy.js.map