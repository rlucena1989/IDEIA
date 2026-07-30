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
exports.ADRValidator = exports.SECTION_PATTERNS = exports.REQUIRED_SECTIONS = void 0;
exports.createADRValidator = createADRValidator;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
exports.REQUIRED_SECTIONS = ['Status', 'Date', 'Context', 'Decision', 'Consequences'];
exports.SECTION_PATTERNS = {
    Status: /^##\s*Status/im,
    Date: /^##\s*Date/i,
    Context: /^##\s*Context/i,
    Decision: /^##\s*Decision/i,
    Consequences: /^##\s*Consequences/im,
};
class ADRValidator {
    docsAdrDir;
    constructor(docsAdrDir) {
        this.docsAdrDir = docsAdrDir ?? path.join(process.cwd(), 'docs', 'adr');
    }
    validateAll() {
        const results = [];
        if (!fs.existsSync(this.docsAdrDir))
            return results;
        const files = fs.readdirSync(this.docsAdrDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const result = this.validateOne(file);
            results.push(result);
        }
        return results;
    }
    validateOne(filename) {
        const filePath = path.join(this.docsAdrDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const numMatch = filename.match(/^ADR-(\d{3})-/);
        const number = numMatch ? parseInt(numMatch[1] ?? '0', 10) : 0;
        const missingSections = [];
        const errors = [];
        const warnings = [];
        for (const section of exports.REQUIRED_SECTIONS) {
            const pattern = exports.SECTION_PATTERNS[section];
            if (!pattern.test(content)) {
                missingSections.push(section);
                errors.push(`Missing required section: ${section}`);
            }
        }
        if (lines.length < 10) {
            warnings.push('ADR file is too short (< 10 lines)');
        }
        const hasTitle = lines.some(l => l.startsWith('# ADR-'));
        if (!hasTitle) {
            errors.push('Missing ADR title (line starting with "# ADR-")');
        }
        if (number === 0 && !numMatch) {
            errors.push('Filename does not match ADR-XXX-* pattern');
        }
        const validStatuses = ['proposed', 'accepted', 'deprecated', 'superseded'];
        const hasValidStatus = validStatuses.some(s => content.toLowerCase().includes(s));
        if (!hasValidStatus) {
            warnings.push('No valid status found (expected: proposed, accepted, deprecated, superseded)');
        }
        return {
            file: filename,
            number,
            valid: errors.length === 0,
            missingSections,
            errors,
            warnings,
        };
    }
    getStatusSummary() {
        const results = this.validateAll();
        return {
            total: results.length,
            valid: results.filter(r => r.valid).length,
            invalid: results.filter(r => !r.valid).length,
            warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
        };
    }
}
exports.ADRValidator = ADRValidator;
function createADRValidator(docsAdrDir) {
    return new ADRValidator(docsAdrDir);
}
//# sourceMappingURL=adr-validator.js.map