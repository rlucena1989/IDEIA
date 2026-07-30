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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudyScanner = void 0;
exports.createStudyScanner = createStudyScanner;
const fs = __importStar(require("node:fs"));
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('study-scanner');
const path = __importStar(require("node:path"));
const node_events_1 = require("node:events");
const study_intensifier_1 = require("./study-intensifier");
class StudyScanner extends node_events_1.EventEmitter {
    workspaceRoot;
    estudosDir;
    studyIntensifier;
    monitoringHistory = [];
    previousScores = new Map();
    monitoringTimer = null;
    verbose;
    constructor(root, verbose = false) {
        super();
        this.workspaceRoot = root;
        this.verbose = verbose;
        this.estudosDir = this.findEstudosDir(root);
        this.studyIntensifier = new study_intensifier_1.StudyIntensifier(root, verbose);
    }
    log(msg) {
        if (this.verbose)
            logger.info('[StudyScanner] ${msg}');
    }
    findEstudosDir(root) {
        const candidates = [
            path.join(root, 'docs', 'ESTUDOS'),
            path.join(root, '..', 'docs', 'ESTUDOS'),
        ];
        for (const c of candidates) {
            if (fs.existsSync(c))
                return c;
        }
        return '';
    }
    scanAll() {
        if (!this.estudosDir)
            return [];
        const gaps = this.studyIntensifier.scanGaps();
        const files = fs.readdirSync(this.estudosDir).filter(f => f.endsWith('.md'));
        const scores = [];
        for (const file of files) {
            const filePath = path.join(this.estudosDir, file);
            const gap = gaps.find(g => g.filePath === filePath);
            const previousScore = this.previousScores.get(file) ?? 5;
            let score = 5;
            let missingSections = [];
            if (gap) {
                score = gap.currentScore;
                missingSections = gap.missing;
            }
            this.previousScores.set(file, score);
            scores.push({
                name: file.replace('.md', ''),
                filePath,
                score,
                previousScore,
                missingSections,
                lastScanned: Date.now(),
            });
        }
        scores.sort((a, b) => a.score - b.score);
        this.emit('scan:complete', { scores, timestamp: Date.now() });
        return scores;
    }
    startContinuousMonitoring(intervalMs = 30 * 60 * 1000) {
        if (this.monitoringTimer) {
            this.log('Monitoring already running');
            return;
        }
        this.log(`Starting continuous monitoring every ${Math.round(intervalMs / 60000)}min`);
        const runScan = () => {
            try {
                const scores = this.scanAll();
                const avgScore = scores.length > 0
                    ? Math.round((scores.reduce((s, sc) => s + sc.score, 0) / scores.length) * 10) / 10
                    : 0;
                const degraded = scores.filter(s => s.score < s.previousScore);
                const improved = scores.filter(s => s.score > s.previousScore);
                const entry = {
                    timestamp: Date.now(),
                    averageScore: avgScore,
                    totalStudies: scores.length,
                    degraded,
                    improved,
                };
                this.monitoringHistory.push(entry);
                if (this.monitoringHistory.length > 100)
                    this.monitoringHistory.shift();
                if (degraded.length > 0) {
                    this.log(`⚠️ ${degraded.length} studies degraded`);
                    this.emit('monitoring:degraded', { entries: degraded, timestamp: Date.now() });
                }
                if (improved.length > 0) {
                    this.log(`✓ ${improved.length} studies improved`);
                }
                this.log(`Avg score: ${avgScore}/5 (${scores.length} studies)`);
                this.emit('monitoring:tick', { entry, timestamp: Date.now() });
            }
            catch (_err) {
                this.log(`Scan error: ${_err instanceof Error ? _err.message : String(_err)}`);
                this.emit('monitoring:error', { error: _err, timestamp: Date.now() });
            }
        };
        runScan();
        this.monitoringTimer = setInterval(runScan, intervalMs);
    }
    stopContinuousMonitoring() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
            this.log('Monitoring stopped');
        }
    }
    getMonitoringHistory() {
        return [...this.monitoringHistory];
    }
    getLatestScores() {
        return this.scanAll();
    }
    alertOnDegradation(threshold) {
        const scores = this.scanAll();
        const degraded = scores.filter(s => s.score < threshold);
        if (degraded.length > 0) {
            this.emit('monitoring:degraded', { entries: degraded, threshold, timestamp: Date.now() });
            for (const d of degraded) {
                this.log(`ALERT: ${d.name} score ${d.score} is below threshold ${threshold}`);
            }
        }
        const avgScore = scores.length > 0
            ? scores.reduce((s, sc) => s + sc.score, 0) / scores.length
            : 0;
        if (avgScore < threshold) {
            this.emit('monitoring:critical', { averageScore: avgScore, threshold, timestamp: Date.now() });
            this.log(`CRITICAL: Average score ${avgScore.toFixed(1)} is below threshold ${threshold}`);
        }
    }
    isMonitoring() {
        return this.monitoringTimer !== null;
    }
}
exports.StudyScanner = StudyScanner;
function createStudyScanner(root, verbose) {
    return new StudyScanner(root, verbose);
}
//# sourceMappingURL=study-scanner.js.map