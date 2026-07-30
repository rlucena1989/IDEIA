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
exports.CrossProjectLearner = void 0;
exports.createCrossProjectLearner = createCrossProjectLearner;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
class CrossProjectLearner {
    profiles = [];
    persistencePath;
    constructor(persistencePath) {
        this.persistencePath = persistencePath;
        this.load();
    }
    learn(projectName, patterns, decisions) {
        const profile = {
            projectPath: projectName,
            language: this.detectLanguage(patterns),
            frameworks: patterns.filter(p => this.isFramework(p)),
            directoryStructure: patterns.filter(p => p.startsWith('dir:')),
            conventions: patterns.filter(p => !this.isFramework(p) && !p.startsWith('dir:')),
            decisions,
            detectedAt: new Date().toISOString(),
        };
        const existingIdx = this.profiles.findIndex(p => p.projectPath === projectName);
        if (existingIdx >= 0) {
            this.profiles[existingIdx] = profile;
        }
        else {
            this.profiles.push(profile);
        }
        this.save();
    }
    getCrossProjectInsights() {
        const insights = [];
        const frameworkCount = new Map();
        const structureCount = new Map();
        const conventionCount = new Map();
        const decisionPatterns = new Map();
        for (const profile of this.profiles) {
            for (const fw of profile.frameworks) {
                const fwList = frameworkCount.get(fw);
                if (fwList)
                    fwList.push(profile.projectPath);
                else
                    frameworkCount.set(fw, [profile.projectPath]);
            }
            for (const dir of profile.directoryStructure) {
                const dirList = structureCount.get(dir);
                if (dirList)
                    dirList.push(profile.projectPath);
                else
                    structureCount.set(dir, [profile.projectPath]);
            }
            for (const conv of profile.conventions) {
                const convList = conventionCount.get(conv);
                if (convList)
                    convList.push(profile.projectPath);
                else
                    conventionCount.set(conv, [profile.projectPath]);
            }
            for (const dec of profile.decisions) {
                const key = dec.decision.substring(0, 40);
                const decList = decisionPatterns.get(key);
                if (decList)
                    decList.push(profile.projectPath);
                else
                    decisionPatterns.set(key, [profile.projectPath]);
            }
        }
        const total = this.profiles.length || 1;
        for (const [pattern, projects] of frameworkCount) {
            if (projects.length >= 1)
                insights.push({
                    pattern: `Framework: ${pattern}`,
                    frequency: projects.length,
                    projects,
                    confidence: Math.round((projects.length / total) * 100) / 100,
                    recommendation: projects.length >= 2 ? `Consider standardizing on ${pattern} — used in ${projects.length}/${total} projects` : undefined,
                    category: 'framework',
                });
        }
        for (const [pattern, projects] of structureCount) {
            if (projects.length >= 1)
                insights.push({
                    pattern: `Structure: ${pattern}`,
                    frequency: projects.length,
                    projects,
                    confidence: Math.round((projects.length / total) * 100) / 100,
                    category: 'structure',
                });
        }
        for (const [pattern, projects] of conventionCount) {
            if (projects.length >= 2)
                insights.push({
                    pattern: `Convention: ${pattern}`,
                    frequency: projects.length,
                    projects,
                    confidence: Math.round((projects.length / total) * 100) / 100,
                    category: 'convention',
                });
        }
        for (const [pattern, projects] of decisionPatterns) {
            if (projects.length >= 2)
                insights.push({
                    pattern: `Decision: ${pattern}`,
                    frequency: projects.length,
                    projects,
                    confidence: Math.round((projects.length / total) * 100) / 100,
                    category: 'decision',
                });
        }
        return insights.sort((a, b) => b.frequency - a.frequency);
    }
    getRecommendation(context) {
        const ctx = context.toLowerCase();
        const matchingPatterns = [];
        for (const insight of this.getCrossProjectInsights()) {
            if (insight.pattern.toLowerCase().includes(ctx) || ctx.includes(insight.pattern.toLowerCase().slice(0, 10))) {
                matchingPatterns.push({
                    pattern: insight.pattern,
                    confidence: insight.confidence,
                    projects: insight.projects,
                });
            }
        }
        if (matchingPatterns.length === 0) {
            for (const insight of this.getCrossProjectInsights().slice(0, 3)) {
                matchingPatterns.push({
                    pattern: insight.pattern,
                    confidence: insight.confidence,
                    projects: insight.projects,
                });
            }
        }
        return {
            context,
            suggestedPatterns: matchingPatterns.slice(0, 5),
            source: `cross-project-learner (${this.profiles.length} projects)`,
        };
    }
    getProjectSimilarity(projectA, projectB) {
        const profileA = this.profiles.find(p => p.projectPath === projectA);
        const profileB = this.profiles.find(p => p.projectPath === projectB);
        if (!profileA || !profileB)
            return 0;
        const allFrameworks = new Set([...profileA.frameworks, ...profileB.frameworks]);
        const allConventions = new Set([...profileA.conventions, ...profileB.conventions]);
        const allDirs = new Set([...profileA.directoryStructure, ...profileB.directoryStructure]);
        if (allFrameworks.size === 0 && allConventions.size === 0 && allDirs.size === 0)
            return 0;
        let matches = 0;
        let total = 0;
        for (const fw of allFrameworks) {
            total++;
            if (profileA.frameworks.includes(fw) && profileB.frameworks.includes(fw))
                matches++;
        }
        for (const conv of allConventions) {
            total++;
            if (profileA.conventions.includes(conv) && profileB.conventions.includes(conv))
                matches++;
        }
        for (const dir of allDirs) {
            total++;
            if (profileA.directoryStructure.includes(dir) && profileB.directoryStructure.includes(dir))
                matches++;
        }
        return total > 0 ? Math.round((matches / total) * 100) / 100 : 0;
    }
    getProfileCount() {
        return this.profiles.length;
    }
    listProjectNames() {
        return this.profiles.map(p => p.projectPath);
    }
    detectLanguage(patterns) {
        const langPatterns = {
            typescript: ['typescript', 'tsconfig', '.ts', 'tsx'],
            python: ['python', 'requirements.txt', 'setup.py', '.py'],
            rust: ['rust', 'cargo.toml', '.rs'],
            go: ['go.mod', '.go'],
            java: ['pom.xml', 'build.gradle', '.java'],
        };
        for (const [lang, indicators] of Object.entries(langPatterns)) {
            for (const indicator of indicators) {
                if (patterns.some(p => p.toLowerCase().includes(indicator)))
                    return lang;
            }
        }
        return 'unknown';
    }
    isFramework(pattern) {
        const frameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'express', 'fastify',
            'nestjs', 'django', 'flask', 'fastapi', 'spring', 'laravel', 'rails', 'actix', 'axum',
            'rocket', 'gin', 'echo', 'fiber', 'tide', 'typescript', 'node'];
        return frameworks.some(fw => pattern.toLowerCase().includes(fw));
    }
    load() {
        if (!this.persistencePath)
            return;
        try {
            if (fs.existsSync(this.persistencePath)) {
                const data = JSON.parse(fs.readFileSync(this.persistencePath, 'utf-8'));
                this.profiles = data.profiles ?? [];
            }
        }
        catch {
            this.profiles = [];
        }
    }
    save() {
        if (!this.persistencePath)
            return;
        try {
            const dir = path.dirname(this.persistencePath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.persistencePath, JSON.stringify({ profiles: this.profiles, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
        }
        catch (_err) {
            // Log silenciado propositalmente — falha nao bloqueia fluxo
        }
    }
}
exports.CrossProjectLearner = CrossProjectLearner;
function createCrossProjectLearner(persistencePath) {
    return new CrossProjectLearner(persistencePath);
}
//# sourceMappingURL=cross-project-learner.js.map