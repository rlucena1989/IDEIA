"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PiiOutputValidator = void 0;
exports.createPiiOutputValidator = createPiiOutputValidator;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('pii-output-validator');
const ENHANCED_PII_RULES = [
    // Brazilian PII
    { pattern: /(?:[0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\.?[0-9]{1})/g, action: 'block', severity: 'high', category: 'br-rg-leak', description: 'Brazilian RG (Registro Geral) leaked' },
    { pattern: /(?:\d{11})/g, action: 'warn', severity: 'high', category: 'br-cnh-leak', description: 'Brazilian CNH (driver license) leaked' },
    { pattern: /(?:\d{3}\s?\d{3}\s?\d{3}\s?\d{1})/g, action: 'warn', severity: 'high', category: 'br-title-leak', description: 'Brazilian Titulo de Eleitor leaked' },
    { pattern: /(?:\d{3}\s?\d{3}\s?\d{3}\s?\d{4}\s?\d{2})/g, action: 'block', severity: 'high', category: 'br-sus-leak', description: 'Brazilian Cartao SUS leaked' },
    // International PII
    { pattern: /(?:[A-Z]{2}[0-9]{7})/g, action: 'block', severity: 'high', category: 'eu-passport-leak', description: 'EU passport number leaked (format: 2 letters + 7 digits)' },
    { pattern: /(?:[A-Z]{2}\s?\d{6}\s?[A-Z])/g, action: 'block', severity: 'high', category: 'uk-nino-leak', description: 'UK National Insurance Number (NINO) leaked' },
    { pattern: /(?:\d{3}-\d{3}-\d{3})/g, action: 'block', severity: 'high', category: 'ca-sin-leak', description: 'Canadian Social Insurance Number (SIN) leaked' },
    // Financial
    { pattern: /(?:[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)/g, action: 'warn', severity: 'medium', category: 'swift-bic-leak', description: 'SWIFT/BIC code leaked' },
    { pattern: /(?:[A-Z]{2}[0-9]{2}[A-Z0-9]{4,})/g, action: 'block', severity: 'high', category: 'iban-detailed-leak', description: 'IBAN (detailed) leaked in output' },
    { pattern: /(?:\b(?:34|37|4\d|5[1-5]|6011|62\d|64[4-9]|65)\d{13,15}\b)/g, action: 'block', severity: 'high', category: 'cc-enhanced-leak', description: 'Credit card number (enhanced detection) leaked' },
    // Health / HIPAA
    { pattern: /(?:MRN\s*[#:]\s*\d{6,10})/gi, action: 'block', severity: 'critical', category: 'hipaa-mrn-leak', description: 'HIPAA Medical Record Number (MRN) leaked' },
    { pattern: /(?:health\s+(plan|insurance)\s*(?:id|number|#)?\s*[:#]\s*[A-Z0-9]{6,20})/gi, action: 'block', severity: 'critical', category: 'hipaa-plan-id-leak', description: 'HIPAA health plan identifier leaked' },
    { pattern: /(?:patient\s*(?:id|number|identifier|code)\s*[:#]\s*[A-Z0-9]{4,20})/gi, action: 'block', severity: 'critical', category: 'hipaa-patient-id-leak', description: 'Patient identifier (HIPAA) leaked' },
    // Location / Geospatial
    { pattern: /(?:-?\d{1,3}\.\d{4,})\s*[,;]\s*(-?\d{1,3}\.\d{4,})/g, action: 'warn', severity: 'medium', category: 'gps-coords-leak', description: 'GPS coordinates leaked' },
    { pattern: /(?:(?:Rua|Avenida|Av|Estrada|Travessa|Praça|Alameda|Rodovia)\s+[\w\s]{3,50}\s*,\s*\d{1,5})/gi, action: 'warn', severity: 'medium', category: 'br-address-leak', description: 'Brazilian street address leaked' },
    { pattern: /(?:(?:Street|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way|Court|Ct|Place|Pl)\s+[\w\s]{3,50}\s*,\s*\d{1,5})/gi, action: 'warn', severity: 'medium', category: 'us-address-leak', description: 'US/UK street address leaked' },
    // Phone number variants
    { pattern: /(?:\+\d{1,3}\s?\(?\d{1,4}\)?\s?\d{1,4}\s?\d{1,4}\s?\d{1,4})/g, action: 'block', severity: 'high', category: 'intl-phone-leak', description: 'International phone number leaked' },
    { pattern: /(?:(?:\+\d{1,3}[-\s]?)?\(?\d{2,4}\)?[-\s]?\d{3,4}[-\s]?\d{3,4})/g, action: 'warn', severity: 'medium', category: 'phone-variant-leak', description: 'Phone number (variant format) leaked' },
];
const CONFIDENCE_WEIGHTS = {
    'br-rg-leak': 0.85,
    'br-cnh-leak': 0.75,
    'br-title-leak': 0.7,
    'br-sus-leak': 0.8,
    'eu-passport-leak': 0.8,
    'uk-nino-leak': 0.85,
    'ca-sin-leak': 0.85,
    'swift-bic-leak': 0.7,
    'iban-detailed-leak': 0.8,
    'cc-enhanced-leak': 0.9,
    'hipaa-mrn-leak': 0.85,
    'hipaa-plan-id-leak': 0.8,
    'hipaa-patient-id-leak': 0.8,
    'gps-coords-leak': 0.7,
    'br-address-leak': 0.65,
    'us-address-leak': 0.65,
    'intl-phone-leak': 0.85,
    'phone-variant-leak': 0.6,
};
const CONTEXT_HINTS = {
    'br-rg-leak': [/rg\s*[:.]?\s*\d/i, /registro\s+geral/i, /identidade\s+[:.]?\s*\d/i],
    'br-cnh-leak': [/cnh\s*[:.]?\s*\d/i, /carteira\s+(de\s+)?motorista/i, /habilitação/i],
    'eu-passport-leak': [/passport\s*[:.]?\s*[A-Z]/i, /passaporte/i, /travel\s+document/i],
    'uk-nino-leak': [/nino\s*[:.]?\s*[A-Z]/i, /national\s+insurance/i, /ni\s+number/i],
    'ca-sin-leak': [/sin\s*[:.]?\s*\d/i, /social\s+insurance/i, /canada\s+sin/i],
    'hipaa-mrn-leak': [/mrn\s*[:.]?\s*\d/i, /medical\s+record/i, /patient\s+id/i],
    'gps-coords-leak': [/gps\s*[:.]?\s*-?\d/i, /coordinates?\s*[:.]?\s*-?\d/i, /lat[\s,:]*\-?\d/i],
};
class PiiOutputValidator {
    enhancedRules;
    constructor() {
        this.enhancedRules = ENHANCED_PII_RULES;
    }
    validate(output) {
        const issues = [];
        let totalConfidence = 0;
        for (const rule of this.enhancedRules) {
            let match;
            const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
            while ((match = regex.exec(output)) !== null) {
                const contextResult = this.evaluateContext(output, match.index, rule.category, match[0]);
                const baseConfidence = CONFIDENCE_WEIGHTS[rule.category] || 0.6;
                const adjustedConfidence = contextResult.confidence > 0
                    ? Math.min(baseConfidence + 0.15, 1.0)
                    : baseConfidence;
                issues.push({
                    category: rule.category,
                    severity: this.adjustSeverity(rule.severity, adjustedConfidence),
                    action: rule.action,
                    match: match[0].length > 30 ? match[0].slice(0, 27) + '...' : match[0],
                    position: match.index,
                    description: rule.description,
                    suggestion: this.getSuggestion(rule.category),
                });
                totalConfidence = Math.max(totalConfidence, adjustedConfidence);
            }
        }
        const severityOrder = ['low', 'medium', 'high', 'critical'];
        let maxSeverityIdx = -1;
        for (const issue of issues) {
            const idx = severityOrder.indexOf(issue.severity);
            if (idx > maxSeverityIdx)
                maxSeverityIdx = idx;
        }
        const riskLevel = maxSeverityIdx >= 0
            ? severityOrder[maxSeverityIdx]
            : 'low';
        return {
            issues,
            confidence: issues.length > 0 ? totalConfidence : 0,
            riskLevel,
        };
    }
    addRule(rule) {
        this.enhancedRules.push(rule);
    }
    getRules() {
        return [...this.enhancedRules];
    }
    evaluateContext(output, matchPos, category, matchValue) {
        const windowStart = Math.max(0, matchPos - 60);
        const windowEnd = Math.min(output.length, matchPos + matchValue.length + 60);
        const surroundingContext = output.slice(windowStart, windowEnd);
        const hints = CONTEXT_HINTS[category];
        if (!hints) {
            return { raw: surroundingContext, normalized: surroundingContext, type: category, confidence: 0 };
        }
        let contextConfidence = 0;
        for (const hint of hints) {
            if (hint.test(surroundingContext)) {
                contextConfidence = Math.max(contextConfidence, 0.3);
            }
        }
        return {
            raw: surroundingContext,
            normalized: surroundingContext.toLowerCase().replace(/\s+/g, ' ').trim(),
            type: category,
            confidence: contextConfidence,
        };
    }
    adjustSeverity(severity, confidence) {
        if (confidence >= 0.9)
            return severity;
        if (confidence >= 0.7)
            return severity;
        if (confidence >= 0.5) {
            if (severity === 'critical')
                return 'high';
            return severity;
        }
        if (severity === 'critical')
            return 'high';
        if (severity === 'high')
            return 'medium';
        return severity;
    }
    getSuggestion(category) {
        const suggestions = {
            'br-rg-leak': 'Brazilian RG should never appear in LLM output — review prompt context for PII leakage',
            'br-cnh-leak': 'Brazilian CNH (driver license) is sensitive PII — verify data isolation',
            'br-title-leak': 'Brazilian Titulo de Eleitor is PII — remove from output context',
            'br-sus-leak': 'Brazilian SUS card number is protected health information',
            'eu-passport-leak': 'EU passport numbers are sensitive PII — review prompt access to travel documents',
            'uk-nino-leak': 'UK National Insurance Number is sensitive PII — verify data isolation',
            'ca-sin-leak': 'Canadian SIN is sensitive PII — never expose in LLM output',
            'swift-bic-leak': 'SWIFT/BIC codes should not appear in LLM output — review financial data access',
            'iban-detailed-leak': 'Full IBAN is sensitive financial PII — restrict data source access',
            'cc-enhanced-leak': 'Credit card numbers must never appear in LLM output',
            'hipaa-mrn-leak': 'Medical Record Numbers are HIPAA protected — immediate review required',
            'hipaa-plan-id-leak': 'Health plan identifiers are HIPAA protected — restrict data access',
            'hipaa-patient-id-leak': 'Patient identifiers are HIPAA protected — immediate review required',
            'gps-coords-leak': 'GPS coordinates can identify individuals — review context data',
            'br-address-leak': 'Street addresses are PII — verify data minimization settings',
            'us-address-leak': 'Street addresses are PII — verify data minimization settings',
            'intl-phone-leak': 'International phone numbers are PII — review data isolation',
            'phone-variant-leak': 'Phone numbers in various formats are PII — mask output',
        };
        return suggestions[category] || 'This PII type should not appear in LLM output';
    }
}
exports.PiiOutputValidator = PiiOutputValidator;
function createPiiOutputValidator() {
    return new PiiOutputValidator();
}
//# sourceMappingURL=pii-output-validator.js.map