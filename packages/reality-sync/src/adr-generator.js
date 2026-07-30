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
exports.ADRGenerator = void 0;
exports.createADRGenerator = createADRGenerator;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
class ADRGenerator {
    docsAdrDir;
    constructor(docsAdrDir) {
        this.docsAdrDir = docsAdrDir ?? path.join(process.cwd(), 'docs', 'adr');
    }
    ensureDir() {
        if (!fs.existsSync(this.docsAdrDir)) {
            fs.mkdirSync(this.docsAdrDir, { recursive: true });
        }
    }
    getNextNumber() {
        this.ensureDir();
        let maxNum = 0;
        try {
            const files = fs.readdirSync(this.docsAdrDir);
            for (const file of files) {
                const match = file.match(/^ADR-(\d{3})-/);
                if (match) {
                    const num = parseInt(match[1] ?? '0', 10);
                    if (num > maxNum)
                        maxNum = num;
                }
            }
        }
        catch { }
        return maxNum + 1;
    }
    sanitizeTitle(title) {
        return title
            .toLowerCase()
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60);
    }
    generateADR(input) {
        const number = this.getNextNumber();
        const paddedNum = String(number).padStart(3, '0');
        const slug = this.sanitizeTitle(input.title);
        const fileName = `ADR-${paddedNum}-${slug}.md`;
        const fullPath = path.join(this.docsAdrDir, fileName);
        const today = new Date().toISOString().split('T')[0];
        const status = input.status || 'proposed';
        const content = `# ADR-${paddedNum}: ${input.title}

## Status

${status}

## Date

${today}

## Context

${input.context}

## Decision

${input.decision}

## Consequences

${input.consequences}
`;
        this.ensureDir();
        fs.writeFileSync(fullPath, content, 'utf-8');
        return {
            number,
            title: input.title,
            filePath: path.relative(process.cwd(), fullPath),
            fullPath,
        };
    }
    listADRs() {
        this.ensureDir();
        const results = [];
        try {
            const files = fs.readdirSync(this.docsAdrDir);
            for (const file of files) {
                const match = file.match(/^ADR-(\d{3})-(.+)\.md$/);
                if (match) {
                    results.push({
                        number: parseInt(match[1] ?? '0', 10),
                        title: (match[2] ?? '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                        filePath: `docs/adr/${file}`,
                        fullPath: path.join(this.docsAdrDir, file),
                    });
                }
            }
        }
        catch { }
        return results.sort((a, b) => a.number - b.number);
    }
    getADR(number) {
        this.ensureDir();
        try {
            const files = fs.readdirSync(this.docsAdrDir);
            const file = files.find(f => f.startsWith(`ADR-${String(number).padStart(3, '0')}-`));
            if (file) {
                return fs.readFileSync(path.join(this.docsAdrDir, file), 'utf-8');
            }
        }
        catch { }
        return null;
    }
    getADRTemplates() {
        return [
            'technology-adoption',
            'architecture-change',
            'api-change',
            'tool-creation',
        ];
    }
    generateFromTemplate(templateName, variables) {
        const templates = {
            'technology-adoption': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

We are considering adopting {technology} for {purpose}.

## Decision

We will adopt {technology} because: {reasons}.

## Consequences

{consequences}`,
            'architecture-change': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

{context}

## Decision

{decision}

## Consequences

{consequences}`,
            'api-change': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

{context}

## Decision

{decision}

## Consequences

{consequences}`,
            'tool-creation': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

{context}

## Decision

{decision}

## Consequences

{consequences}`,
        };
        const template = templates[templateName];
        if (!template)
            throw new Error(`Unknown template: ${templateName}`);
        let content = template;
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        const number = this.getNextNumber();
        const paddedNum = String(number).padStart(3, '0');
        const title = variables.title || 'Untitled Decision';
        const slug = this.sanitizeTitle(title);
        const fileName = `ADR-${paddedNum}-${slug}.md`;
        const fullPath = path.join(this.docsAdrDir, fileName);
        this.ensureDir();
        fs.writeFileSync(fullPath, content, 'utf-8');
        return {
            number,
            title,
            filePath: path.relative(process.cwd(), fullPath),
            fullPath,
        };
    }
    validateADR(number) {
        const content = this.getADR(number);
        if (!content)
            return { valid: false, missingSections: [], errors: ['ADR not found'] };
        const requiredSections = ['## Status', '## Date', '## Context', '## Decision', '## Consequences'];
        const missingSections = requiredSections.filter(s => !content.includes(s));
        return {
            valid: missingSections.length === 0,
            missingSections,
            errors: missingSections.map(s => `Missing section: ${s}`),
        };
    }
    validateAllADRs() {
        return this.listADRs().map(adr => ({
            number: adr.number,
            title: adr.title,
            ...this.validateADR(adr.number),
        }));
    }
}
exports.ADRGenerator = ADRGenerator;
function createADRGenerator(docsAdrDir) {
    return new ADRGenerator(docsAdrDir);
}
//# sourceMappingURL=adr-generator.js.map