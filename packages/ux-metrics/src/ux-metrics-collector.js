"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UxMetricsCollector = void 0;
exports.normalizeNps = normalizeNps;
exports.createUxMetricsCollector = createUxMetricsCollector;
const fs = __importStar(require("fs"));
const logger_1 = require("@ideia/logger");
const path = __importStar(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const logger = (0, logger_1.createLogger)('ux-metrics-collector');
function percentile(sorted, p) {
    const idx = Math.ceil(p / 100 * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}
function normalizeNps(score) {
    return Math.round((score + 100) / 2);
}
class UxMetricsCollector {
    npsResponses = [];
    susResponses = [];
    cesResponses = [];
    timeToTaskRecords = [];
    pageLoads = [];
    errors = [];
    satisfactionRecords = [];
    a11yRecords = [];
    config;
    activeTimers = new Map();
    db = null;
    constructor(config) {
        this.config = {
            storagePath: '.ux-metrics',
            maxHistory: 1000,
            sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ...config,
        };
        if (this.config.useSqlite) {
            this.initSqlite();
        }
    }
    getConfig() { return { ...this.config }; }
    initSqlite(dbPath) {
        const target = dbPath || path.join(this.config.storagePath, 'metrics.db');
        const dir = path.dirname(target);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        this.db = new better_sqlite3_1.default(target);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS nps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        score INTEGER NOT NULL,
        reason TEXT,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        answers TEXT NOT NULL,
        score INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        task_label TEXT NOT NULL,
        score INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS time_to_task (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        task_label TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_ms INTEGER DEFAULT 0,
        session_id TEXT NOT NULL,
        completed INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS page_loads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        load_time_ms INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        error_type TEXT NOT NULL,
        message TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS satisfaction (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        score INTEGER NOT NULL,
        context TEXT,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS a11y (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        violations INTEGER NOT NULL,
        source TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL
      );
    `);
        this.loadSqlite();
    }
    saveSqlite() {
        if (!this.db)
            return;
        const db = this.db;
        const insertNps = db.prepare('INSERT INTO nps (score, reason, timestamp, session_id) VALUES (?, ?, ?, ?)');
        const insertSus = db.prepare('INSERT INTO sus (answers, score, timestamp, session_id) VALUES (?, ?, ?, ?)');
        const insertCes = db.prepare('INSERT INTO ces (task_id, task_label, score, duration_ms, timestamp, session_id) VALUES (?, ?, ?, ?, ?, ?)');
        const insertTtt = db.prepare('INSERT INTO time_to_task (task_id, task_label, start_time, end_time, duration_ms, session_id, completed) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const insertPl = db.prepare('INSERT INTO page_loads (url, load_time_ms, timestamp, session_id) VALUES (?, ?, ?, ?)');
        const insertErr = db.prepare('INSERT INTO errors (error_type, message, count, timestamp, session_id) VALUES (?, ?, ?, ?, ?)');
        const insertSat = db.prepare('INSERT INTO satisfaction (score, context, timestamp, session_id) VALUES (?, ?, ?, ?)');
        const insertA11y = db.prepare('INSERT INTO a11y (rule_id, score, violations, source, timestamp, session_id) VALUES (?, ?, ?, ?, ?, ?)');
        const tx = db.transaction(() => {
            db.exec('DELETE FROM nps; DELETE FROM sus; DELETE FROM ces; DELETE FROM time_to_task; DELETE FROM page_loads; DELETE FROM errors; DELETE FROM satisfaction; DELETE FROM a11y');
            for (const r of this.npsResponses)
                insertNps.run(r.score, r.reason || null, r.timestamp, r.sessionId);
            for (const r of this.susResponses)
                insertSus.run(JSON.stringify(r.answers), r.score, r.timestamp, r.sessionId);
            for (const r of this.cesResponses)
                insertCes.run(r.taskId, r.taskLabel, r.score, r.durationMs, r.timestamp, r.sessionId);
            for (const r of this.timeToTaskRecords)
                insertTtt.run(r.taskId, r.taskLabel, r.startTime, r.endTime, r.durationMs, r.sessionId, r.completed ? 1 : 0);
            for (const r of this.pageLoads)
                insertPl.run(r.url, r.loadTimeMs, r.timestamp, r.sessionId);
            for (const r of this.errors)
                insertErr.run(r.errorType, r.message, r.count, r.timestamp, r.sessionId);
            for (const r of this.satisfactionRecords)
                insertSat.run(r.score, r.context || null, r.timestamp, r.sessionId);
            for (const r of this.a11yRecords)
                insertA11y.run(r.ruleId, r.score, r.violations, r.source, r.timestamp, r.sessionId);
        });
        tx();
    }
    loadSqlite() {
        if (!this.db)
            return;
        const db = this.db;
        const limit = this.config.maxHistory;
        const npsRows = db.prepare('SELECT score, reason, timestamp, session_id FROM nps ORDER BY id DESC LIMIT ?').all(limit);
        for (const row of npsRows.reverse()) {
            this.npsResponses.push({ score: row.score, reason: row.reason || undefined, timestamp: row.timestamp, sessionId: row.session_id });
        }
        const susRows = db.prepare('SELECT answers, score, timestamp, session_id FROM sus ORDER BY id DESC LIMIT ?').all(limit);
        for (const row of susRows.reverse()) {
            this.susResponses.push({ answers: JSON.parse(row.answers), score: row.score, timestamp: row.timestamp, sessionId: row.session_id });
        }
        const cesRows = db.prepare('SELECT task_id, task_label, score, duration_ms, timestamp, session_id FROM ces ORDER BY id DESC LIMIT ?').all(limit);
        for (const row of cesRows.reverse()) {
            this.cesResponses.push({ taskId: row.task_id, taskLabel: row.task_label, score: row.score, durationMs: row.duration_ms, timestamp: row.timestamp, sessionId: row.session_id });
        }
        const tttRows = db.prepare('SELECT task_id, task_label, start_time, end_time, duration_ms, session_id, completed FROM time_to_task ORDER BY id DESC LIMIT ?').all(limit);
        for (const row of tttRows.reverse()) {
            this.timeToTaskRecords.push({ taskId: row.task_id, taskLabel: row.task_label, startTime: row.start_time, endTime: row.end_time || '', durationMs: row.duration_ms, sessionId: row.session_id, completed: row.completed === 1 });
        }
        const plRows = db.prepare('SELECT url, load_time_ms, timestamp, session_id FROM page_loads ORDER BY id DESC LIMIT ?').all(limit);
        for (const row of plRows.reverse()) {
            this.pageLoads.push({ url: row.url, loadTimeMs: row.load_time_ms, timestamp: row.timestamp, sessionId: row.session_id });
        }
        const errRows = db.prepare('SELECT error_type, message, count, timestamp, session_id FROM errors ORDER BY id DESC LIMIT ?').all(limit);
        for (const row of errRows.reverse()) {
            this.errors.push({ errorType: row.error_type, message: row.message, count: row.count, timestamp: row.timestamp, sessionId: row.session_id });
        }
        const satRows = db.prepare('SELECT score, context, timestamp, session_id FROM satisfaction ORDER BY id DESC LIMIT ?').all(limit);
        for (const row of satRows.reverse()) {
            this.satisfactionRecords.push({ score: row.score, context: row.context || undefined, timestamp: row.timestamp, sessionId: row.session_id });
        }
        const a11yRows = db.prepare('SELECT rule_id, score, violations, source, timestamp, session_id FROM a11y ORDER BY id DESC LIMIT ?').all(limit);
        for (const row of a11yRows.reverse()) {
            this.a11yRecords.push({ ruleId: row.rule_id, score: row.score, violations: row.violations, source: row.source, timestamp: row.timestamp, sessionId: row.session_id });
        }
    }
    // Persistence
    save(filePath) {
        if (this.db) {
            this.saveSqlite();
            return;
        }
        const target = filePath || path.join(this.config.storagePath, `metrics-${this.config.sessionId}.json`);
        const dir = path.dirname(target);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const data = {
            nps: this.npsResponses,
            sus: this.susResponses,
            ces: this.cesResponses,
            timeToTask: this.timeToTaskRecords,
            pageLoads: this.pageLoads,
            errors: this.errors,
            satisfaction: this.satisfactionRecords,
            a11y: this.a11yRecords,
            exportedAt: new Date().toISOString(),
        };
        fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf-8');
    }
    load(filePath) {
        if (this.db) {
            this.loadSqlite();
            return true;
        }
        const target = filePath || path.join(this.config.storagePath, `metrics-${this.config.sessionId}.json`);
        try {
            if (!fs.existsSync(target))
                return false;
            const raw = fs.readFileSync(target, 'utf-8');
            const data = JSON.parse(raw);
            this.npsResponses = data.nps || [];
            this.susResponses = data.sus || [];
            this.cesResponses = data.ces || [];
            this.timeToTaskRecords = data.timeToTask || [];
            this.pageLoads = data.pageLoads || [];
            this.errors = data.errors || [];
            this.satisfactionRecords = data.satisfaction || [];
            this.a11yRecords = data.a11y || [];
            return true;
        }
        catch {
            return false;
        }
    }
    static fromFile(filePath, config) {
        const collector = new UxMetricsCollector(config);
        collector.load(filePath);
        return collector;
    }
    // NPS
    recordNps(score, reason) {
        const resp = { score, reason, timestamp: new Date().toISOString(), sessionId: this.config.sessionId };
        this.npsResponses.push(resp);
        if (this.npsResponses.length > this.config.maxHistory)
            this.npsResponses.shift();
        return resp;
    }
    getNpsReport() {
        const total = this.npsResponses.length;
        const promoters = this.npsResponses.filter(r => r.score >= 9).length;
        const passives = this.npsResponses.filter(r => r.score >= 7 && r.score <= 8).length;
        const detractors = this.npsResponses.filter(r => r.score <= 6).length;
        const score = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
        const normalizedScore = normalizeNps(score);
        return { totalResponses: total, promoters, passives, detractors, score, normalizedScore, recentScores: this.npsResponses.slice(-10) };
    }
    normalizeNpsScore(score) {
        const promoters = score >= 9 ? 1 : 0;
        const detractors = score <= 6 ? 1 : 0;
        const passives = score >= 7 && score <= 8 ? 1 : 0;
        const total = promoters + passives + detractors;
        if (total === 0)
            return 0;
        const raw = Math.round(((promoters - detractors) / total) * 100);
        return normalizeNps(raw);
    }
    // SUS
    recordSus(answers) {
        const odd = answers.filter((_, i) => i % 2 === 0).map(v => v - 1);
        const even = answers.filter((_, i) => i % 2 === 1).map(v => 5 - v);
        const sum = [...odd, ...even].reduce((s, v) => s + v, 0);
        const score = Math.round((sum / (answers.length * 4)) * 100);
        const resp = { answers, score: score, timestamp: new Date().toISOString(), sessionId: this.config.sessionId };
        this.susResponses.push(resp);
        if (this.susResponses.length > this.config.maxHistory)
            this.susResponses.shift();
        return resp;
    }
    getSusReport() {
        const scores = this.susResponses.map(r => r.score);
        return {
            totalResponses: scores.length,
            avgScore: scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0,
            minScore: scores.length > 0 ? Math.min(...scores) : 0,
            maxScore: scores.length > 0 ? Math.max(...scores) : 0,
            recentScores: this.susResponses.slice(-10),
        };
    }
    // CES
    recordCes(taskId, taskLabel, score, durationMs) {
        const resp = { taskId, taskLabel, score, timestamp: new Date().toISOString(), sessionId: this.config.sessionId, durationMs };
        this.cesResponses.push(resp);
        if (this.cesResponses.length > this.config.maxHistory)
            this.cesResponses.shift();
        return resp;
    }
    getCesReport() {
        const byTaskType = {};
        for (const r of this.cesResponses) {
            const key = r.taskLabel.split(':')[0] || 'general';
            if (!byTaskType[key])
                byTaskType[key] = { count: 0, avgScore: 0, avgDurationMs: 0 };
            const group = byTaskType[key];
            group.count++;
            group.avgScore = Math.round((group.avgScore * (group.count - 1) + r.score) / group.count * 10) / 10;
            group.avgDurationMs = Math.round((group.avgDurationMs * (group.count - 1) + r.durationMs) / group.count);
        }
        const scores = this.cesResponses.map(r => r.score);
        return {
            totalResponses: scores.length,
            avgScore: scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : 0,
            byTaskType,
            recentScores: this.cesResponses.slice(-10),
        };
    }
    // Time-to-task
    startTask(taskId, taskLabel) {
        this.activeTimers.set(taskId, Date.now());
        const existing = this.timeToTaskRecords.findIndex(r => r.taskId === taskId);
        const record = {
            taskId, taskLabel, startTime: new Date().toISOString(), endTime: '', durationMs: 0, sessionId: this.config.sessionId, completed: false,
        };
        if (existing >= 0)
            this.timeToTaskRecords[existing] = record;
        else
            this.timeToTaskRecords.push(record);
        if (this.timeToTaskRecords.length > this.config.maxHistory)
            this.timeToTaskRecords.shift();
    }
    endTask(taskId) {
        const start = this.activeTimers.get(taskId);
        if (!start)
            return null;
        const durationMs = Date.now() - start;
        this.activeTimers.delete(taskId);
        const record = this.timeToTaskRecords.find(r => r.taskId === taskId);
        if (record) {
            record.endTime = new Date().toISOString();
            record.durationMs = durationMs;
            record.completed = true;
        }
        return record ?? null;
    }
    getTimeToTaskReport() {
        const completed = this.timeToTaskRecords.filter(r => r.completed);
        const durations = completed.map(r => r.durationMs).sort((a, b) => a - b);
        const byTaskType = {};
        for (const r of completed) {
            const key = r.taskLabel.split(':')[0] || 'general';
            if (!byTaskType[key])
                byTaskType[key] = { count: 0, avgDurationMs: 0 };
            const group = byTaskType[key];
            group.count++;
            group.avgDurationMs = Math.round((group.avgDurationMs * (group.count - 1) + r.durationMs) / group.count);
        }
        return {
            totalTasks: this.timeToTaskRecords.length,
            completedTasks: completed.length,
            avgDurationMs: durations.length > 0 ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length) : 0,
            p50DurationMs: durations.length > 0 ? percentile(durations, 50) : 0,
            p95DurationMs: durations.length > 0 ? percentile(durations, 95) : 0,
            byTaskType,
        };
    }
    // Page Load Time
    recordPageLoad(url, loadTimeMs) {
        const record = { url, loadTimeMs, timestamp: new Date().toISOString(), sessionId: this.config.sessionId };
        this.pageLoads.push(record);
        if (this.pageLoads.length > this.config.maxHistory)
            this.pageLoads.shift();
        return record;
    }
    getPageLoadReport() {
        const times = this.pageLoads.map(r => r.loadTimeMs).sort((a, b) => a - b);
        return {
            totalLoads: times.length,
            avgLoadTimeMs: times.length > 0 ? Math.round(times.reduce((s, v) => s + v, 0) / times.length) : 0,
            p50LoadTimeMs: times.length > 0 ? percentile(times, 50) : 0,
            p95LoadTimeMs: times.length > 0 ? percentile(times, 95) : 0,
            maxLoadTimeMs: times.length > 0 ? Math.max(...times) : 0,
            recentLoads: this.pageLoads.slice(-10),
        };
    }
    // Error Rate
    recordError(errorType, message) {
        const record = { errorType, message, count: 1, timestamp: new Date().toISOString(), sessionId: this.config.sessionId };
        const existing = this.errors.find(e => e.errorType === errorType && e.message === message);
        if (existing) {
            existing.count++;
            existing.timestamp = new Date().toISOString();
            return existing;
        }
        this.errors.push(record);
        if (this.errors.length > this.config.maxHistory)
            this.errors.shift();
        return record;
    }
    getErrorReport() {
        const byType = {};
        for (const e of this.errors) {
            byType[e.errorType] = (byType[e.errorType] || 0) + e.count;
        }
        return {
            totalErrors: this.errors.reduce((s, e) => s + e.count, 0),
            byType,
            recentErrors: this.errors.slice(-10),
        };
    }
    getErrorRate(errorType) {
        const total = this.npsResponses.length + this.cesResponses.length + this.pageLoads.length;
        if (total === 0)
            return 0;
        const relevantErrors = errorType
            ? this.errors.filter(e => e.errorType === errorType).reduce((s, e) => s + e.count, 0)
            : this.errors.reduce((s, e) => s + e.count, 0);
        return Math.round((relevantErrors / total) * 10000) / 100;
    }
    // User Satisfaction
    recordSatisfaction(score, context) {
        const record = { score, context, timestamp: new Date().toISOString(), sessionId: this.config.sessionId };
        this.satisfactionRecords.push(record);
        if (this.satisfactionRecords.length > this.config.maxHistory)
            this.satisfactionRecords.shift();
        return record;
    }
    getSatisfactionReport() {
        const scores = this.satisfactionRecords.map(r => r.score);
        const distribution = {};
        for (const s of scores)
            distribution[s] = (distribution[s] || 0) + 1;
        return {
            totalResponses: scores.length,
            avgScore: scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : 0,
            distribution,
            recentScores: this.satisfactionRecords.slice(-10),
        };
    }
    // Accessibility Score
    recordAccessibility(ruleId, score, violations, source) {
        const record = {
            ruleId, score, violations,
            timestamp: new Date().toISOString(),
            sessionId: this.config.sessionId,
            source,
        };
        this.a11yRecords.push(record);
        if (this.a11yRecords.length > this.config.maxHistory)
            this.a11yRecords.shift();
        return record;
    }
    getAccessibilityReport() {
        const scores = this.a11yRecords.map(r => r.score);
        const bySource = {};
        for (const r of this.a11yRecords) {
            if (!bySource[r.source])
                bySource[r.source] = { count: 0, avgScore: 0, totalViolations: 0 };
            const group = bySource[r.source];
            group.count++;
            group.avgScore = Math.round((group.avgScore * (group.count - 1) + r.score) / group.count * 10) / 10;
            group.totalViolations += r.violations;
        }
        return {
            totalChecks: scores.length,
            avgScore: scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : 0,
            minScore: scores.length > 0 ? Math.min(...scores) : 0,
            maxScore: scores.length > 0 ? Math.max(...scores) : 0,
            bySource,
            recentRecords: this.a11yRecords.slice(-10),
        };
    }
    // Dashboard
    getDashboard() {
        const nps = this.getNpsReport();
        const sus = this.getSusReport();
        const ces = this.getCesReport();
        const timeToTask = this.getTimeToTaskReport();
        const pageLoad = this.getPageLoadReport();
        const errors = this.getErrorReport();
        const satisfaction = this.getSatisfactionReport();
        const a11y = this.getAccessibilityReport();
        const npsScore = Math.max(0, (nps.score + 100) / 2);
        const susScore = sus.avgScore;
        const cesScore = ces.avgScore > 0 ? Math.max(0, 100 - ((ces.avgScore - 1) / 6) * 100) : 0;
        const tttScore = timeToTask.avgDurationMs > 0 ? Math.max(0, 100 - Math.min(timeToTask.avgDurationMs / 60000 * 100, 100)) : 0;
        const plScore = pageLoad.avgLoadTimeMs > 0 ? Math.max(0, 100 - Math.min(pageLoad.avgLoadTimeMs / 30000 * 100, 100)) : 0;
        const errScore = errors.totalErrors > 0 ? Math.max(0, 100 - Math.min(errors.totalErrors * 5, 100)) : 100;
        const satScore = satisfaction.avgScore > 0 ? (satisfaction.avgScore / 5) * 100 : 0;
        const a11yScore = a11y.avgScore;
        const overallScore = Math.round((npsScore + susScore + cesScore + tttScore + plScore + errScore + satScore + a11yScore) / 8);
        return { nps, sus, ces, timeToTask, pageLoad, errors, satisfaction, a11y, a11yScore, overallScore };
    }
    getAll() {
        return {
            nps: [...this.npsResponses],
            sus: [...this.susResponses],
            ces: [...this.cesResponses],
            timeToTask: [...this.timeToTaskRecords],
            pageLoads: [...this.pageLoads],
            errors: [...this.errors],
            satisfaction: [...this.satisfactionRecords],
            a11y: [...this.a11yRecords],
        };
    }
    clear() {
        this.npsResponses = [];
        this.susResponses = [];
        this.cesResponses = [];
        this.timeToTaskRecords = [];
        this.pageLoads = [];
        this.errors = [];
        this.satisfactionRecords = [];
        this.a11yRecords = [];
        this.activeTimers.clear();
        this.perfMetrics = [];
        this.optimisticOps.clear();
    }
    // Perceived Performance
    perfMetrics = [];
    optimisticOps = new Map();
    loadingStartTimes = new Map();
    measurePageLoad() {
        const start = performance?.now ? performance.now() : Date.now();
        const loadTime = performance?.timing?.loadEventEnd
            ? performance.timing.loadEventEnd - performance.timing.navigationStart
            : Date.now() - start;
        const metric = {
            name: 'page-load',
            duration: Math.round(loadTime),
            timestamp: new Date().toISOString(),
            category: 'load',
        };
        this.perfMetrics.push(metric);
        if (this.perfMetrics.length > 100)
            this.perfMetrics.shift();
        return metric.duration;
    }
    async measureInteraction(interactionName, fn) {
        const start = performance?.now ? performance.now() : Date.now();
        try {
            const result = await fn();
            const duration = (performance?.now ? performance.now() : Date.now()) - start;
            const metric = {
                name: interactionName,
                duration: Math.round(duration),
                timestamp: new Date().toISOString(),
                category: 'interaction',
            };
            this.perfMetrics.push(metric);
            if (this.perfMetrics.length > 100)
                this.perfMetrics.shift();
            return result;
        }
        catch (_err) {
            const duration = (performance?.now ? performance.now() : Date.now()) - start;
            const metric = {
                name: `${interactionName}:error`,
                duration: Math.round(duration),
                timestamp: new Date().toISOString(),
                category: 'interaction',
            };
            this.perfMetrics.push(metric);
            throw _err;
        }
    }
    measureRender(componentName, renderFn) {
        const start = performance?.now ? performance.now() : Date.now();
        const result = renderFn();
        const duration = (performance?.now ? performance.now() : Date.now()) - start;
        const metric = {
            name: `render:${componentName}`,
            duration: Math.round(duration),
            timestamp: new Date().toISOString(),
            category: 'render',
        };
        this.perfMetrics.push(metric);
        if (this.perfMetrics.length > 100)
            this.perfMetrics.shift();
        return result;
    }
    getPerformanceReport() {
        const renderTimes = this.perfMetrics.filter(m => m.category === 'render').map(m => m.duration);
        const interactionTimes = this.perfMetrics.filter(m => m.category === 'interaction').map(m => m.duration);
        const sorted = [...this.perfMetrics].sort((a, b) => b.duration - a.duration);
        const slowest = sorted.slice(0, 5).map(m => ({ name: m.name, duration: m.duration }));
        const avgRender = renderTimes.length > 0
            ? Math.round(renderTimes.reduce((s, v) => s + v, 0) / renderTimes.length)
            : 0;
        const avgInteraction = interactionTimes.length > 0
            ? Math.round(interactionTimes.reduce((s, v) => s + v, 0) / interactionTimes.length)
            : 0;
        const score = this.getPerceivedPerformanceScore();
        return {
            avgRenderTime: avgRender,
            avgInteractionTime: avgInteraction,
            slowestOperations: slowest,
            totalMeasured: this.perfMetrics.length,
            perceivedScore: score,
        };
    }
    recordOptimistic(operation) {
        const start = performance?.now ? performance.now() : Date.now();
        this.optimisticOps.set(operation, start);
    }
    getPerceivedPerformanceScore() {
        if (this.perfMetrics.length === 0)
            return 100;
        const renderMetrics = this.perfMetrics.filter(m => m.category === 'render');
        const interactionMetrics = this.perfMetrics.filter(m => m.category === 'interaction');
        const loadMetrics = this.perfMetrics.filter(m => m.category === 'load');
        let score = 100;
        const penaltyPerMs = 0.05;
        const maxPenalty = 60;
        if (renderMetrics.length > 0) {
            const avg = renderMetrics.reduce((s, m) => s + m.duration, 0) / renderMetrics.length;
            score -= Math.min(avg * penaltyPerMs, maxPenalty);
        }
        if (interactionMetrics.length > 0) {
            const avg = interactionMetrics.reduce((s, m) => s + m.duration, 0) / interactionMetrics.length;
            score -= Math.min(avg * penaltyPerMs * 0.5, maxPenalty);
        }
        if (loadMetrics.length > 0) {
            const avg = loadMetrics.reduce((s, m) => s + m.duration, 0) / loadMetrics.length;
            score -= Math.min(avg * penaltyPerMs * 0.3, maxPenalty);
        }
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    startLoading(operation) {
        this.loadingStartTimes.set(operation, performance?.now ? performance.now() : Date.now());
    }
    endLoading(operation) {
        const start = this.loadingStartTimes.get(operation);
        if (!start)
            return 0;
        const duration = (performance?.now ? performance.now() : Date.now()) - start;
        this.loadingStartTimes.delete(operation);
        const metric = {
            name: `load:${operation}`,
            duration: Math.round(duration),
            timestamp: new Date().toISOString(),
            category: 'load',
        };
        this.perfMetrics.push(metric);
        if (this.perfMetrics.length > 100)
            this.perfMetrics.shift();
        return metric.duration;
    }
}
exports.UxMetricsCollector = UxMetricsCollector;
function createUxMetricsCollector(config) {
    return new UxMetricsCollector(config);
}
//# sourceMappingURL=ux-metrics-collector.js.map