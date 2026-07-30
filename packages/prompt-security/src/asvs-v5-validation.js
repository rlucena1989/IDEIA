"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV5_1_1 = checkV5_1_1;
exports.checkV5_1_2 = checkV5_1_2;
exports.checkV5_2_1 = checkV5_2_1;
exports.checkV5_2_2 = checkV5_2_2;
exports.checkV5_3_1 = checkV5_3_1;
exports.checkV5_4_1 = checkV5_4_1;
exports.checkV5_5_1 = checkV5_5_1;
exports.checkV5_6_1 = checkV5_6_1;
exports.checkV5_7_1 = checkV5_7_1;
exports.checkV5_8_1 = checkV5_8_1;
exports.runAllV5Checks = runAllV5Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v5-validation');
const CATEGORY = 'V5';
function scanPackageJsonDeps(rootDir, depNames) {
    const found = [];
    function walk(dir) {
        try {
            const pkgPath = node_path_1.default.join(dir, 'package.json');
            if (node_fs_1.default.existsSync(pkgPath)) {
                const content = JSON.parse(node_fs_1.default.readFileSync(pkgPath, 'utf8'));
                const allDeps = { ...content.dependencies, ...content.devDependencies };
                for (const depName of depNames) {
                    if (allDeps[depName]) {
                        found.push(`${depName}@${allDeps[depName]} (in ${node_path_1.default.relative(rootDir, pkgPath)})`);
                    }
                }
            }
        }
        catch {
        }
        try {
            for (const entry of node_fs_1.default.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                    walk(node_path_1.default.join(dir, entry.name));
                }
            }
        }
        catch {
        }
    }
    walk(rootDir);
    return found;
}
function scanFilesForPattern(rootDir, pattern, maxResults = 5) {
    const results = [];
    function walk(dir) {
        if (results.length >= maxResults)
            return;
        try {
            for (const entry of node_fs_1.default.readdirSync(dir, { withFileTypes: true })) {
                if (results.length >= maxResults)
                    return;
                const full = node_path_1.default.join(dir, entry.name);
                if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                    walk(full);
                }
                else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
                    try {
                        const content = node_fs_1.default.readFileSync(full, 'utf8');
                        const match = content.match(pattern);
                        if (match) {
                            const relative = node_path_1.default.relative(rootDir, full);
                            results.push(`${relative}: ${match[0].slice(0, 80)}`);
                        }
                    }
                    catch {
                    }
                }
            }
        }
        catch {
        }
    }
    walk(rootDir);
    return results;
}
function checkV5_1_1(rootDir) {
    const zodDeps = scanPackageJsonDeps(rootDir, ['zod', 'joi', 'yup', 'superstruct', 'io-ts', 'runtypes', '@sinclair/typebox', 'class-validator', 'class-transformer', 'ajv', 'validator']);
    const zodSchemas = scanFilesForPattern(rootDir, /z\.object\(|new\s+Joi\.|yup\.object\(|superstruct\.object\(/);
    const validationPatterns = scanFilesForPattern(rootDir, /(validate|sanitize|sanitise|parseSafe|inputValidation|validationSchema|validateBody|validateQuery|validateParams)/i);
    const passed = zodDeps.length > 0 || zodSchemas.length > 0 || validationPatterns.length > 0;
    const evidence = [];
    if (zodDeps.length > 0)
        evidence.push(`Validation libraries: ${zodDeps.slice(0, 5).join(', ')}`);
    if (zodSchemas.length > 0)
        evidence.push(`Validation schemas: ${zodSchemas.slice(0, 3).join(', ')}`);
    if (validationPatterns.length > 0)
        evidence.push(`Validation calls: ${validationPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No input validation libraries or patterns detected');
    return {
        id: '5.1.1',
        name: 'Verify input validation exists on all inputs',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV5_1_2(rootDir) {
    const helmetDeps = scanPackageJsonDeps(rootDir, ['helmet', 'lusca']);
    const cspPatterns = scanFilesForPattern(rootDir, /(content-security-policy|Content-Security-Policy|CSP|csp)/i);
    const xssPatterns = scanFilesForPattern(rootDir, /(xss|sanitize-html|sanitizeHtml|escapeHtml|escape-html|DOMPurify|dompurify)/i);
    const outputEncodingDeps = scanPackageJsonDeps(rootDir, ['sanitize-html', 'dompurify', 'xss', 'escape-html', 'he']);
    const passed = helmetDeps.length > 0 || cspPatterns.length > 0 || xssPatterns.length > 0 || outputEncodingDeps.length > 0;
    const evidence = [];
    if (helmetDeps.length > 0)
        evidence.push(`HTTP security headers: ${helmetDeps.join(', ')}`);
    if (cspPatterns.length > 0)
        evidence.push(`CSP config: ${cspPatterns.slice(0, 2).join(', ')}`);
    if (xssPatterns.length > 0)
        evidence.push(`XSS protection: ${xssPatterns.slice(0, 2).join(', ')}`);
    if (outputEncodingDeps.length > 0)
        evidence.push(`Output encoding: ${outputEncodingDeps.join(', ')}`);
    if (!passed)
        evidence.push('No output encoding or CSP headers detected');
    return {
        id: '5.1.2',
        name: 'Verify output encoding for HTML/JS/CSS contexts',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV5_2_1(rootDir) {
    const apiParamValidation = scanFilesForPattern(rootDir, /(@Body|@Query|@Param|@Headers|@Req|@Request).{0,100}(Pipe|ValidationPipe|ParseInt|ParseUUID|ParseBool|ParseArray|ParseEnum|ParseFloat|ParseString)/i);
    const paramValidators = scanFilesForPattern(rootDir, /(ValidateNested|IsString|IsNumber|IsInt|IsBoolean|IsEnum|IsArray|IsOptional|IsEmail|IsUUID|IsDate|Min|Max|Length|MinLength|MaxLength|Matches|IsIn)/i);
    const passed = apiParamValidation.length > 0 || paramValidators.length > 0;
    const evidence = [];
    if (apiParamValidation.length > 0)
        evidence.push(`API param validation: ${apiParamValidation.slice(0, 3).join(', ')}`);
    if (paramValidators.length > 0)
        evidence.push(`Param decorator validators: ${paramValidators.slice(0, 4).join(', ')}`);
    if (!passed)
        evidence.push('No API parameter validation detected');
    return { id: '5.2.1', name: 'Verify input validation on all API parameters', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV5_2_2(rootDir) {
    const schemaValidators = scanFilesForPattern(rootDir, /(json.?schema|ajv|JSONSchema|json_schema|schemas.*valid|valid.*schemas|dto|DTO|Dto)/i);
    const xmlSchemaValidators = scanFilesForPattern(rootDir, /(xsd|XML.?schema|xmlns|xml.?valid)/i);
    const passed = schemaValidators.length > 0;
    const evidence = [];
    if (schemaValidators.length > 0)
        evidence.push(`Structured data validation: ${schemaValidators.slice(0, 3).join(', ')}`);
    if (xmlSchemaValidators.length > 0)
        evidence.push(`XML schema validation: ${xmlSchemaValidators.slice(0, 2).join(', ')}`);
    if (!passed)
        evidence.push('No structured data validation (JSON/XML schemas) detected');
    return { id: '5.2.2', name: 'Verify structured data validation (JSON/XML schemas)', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV5_3_1(rootDir) {
    const rateLimitDeps = scanPackageJsonDeps(rootDir, ['express-rate-limit', 'rate-limiter-flexible', 'bottleneck', 'p-limit', 'async-sema', 'token-bucket']);
    const rateLimitPatterns = scanFilesForPattern(rootDir, /(rateLimit|rate.?limit|RateLimiter|rate_limit|throttle|ThrottlerGuard|@Throttle)/i);
    const captchaDeps = scanPackageJsonDeps(rootDir, ['@google-cloud/recaptcha-enterprise', 'express-recaptcha', 'hcaptcha', 'turnstile']);
    const passed = rateLimitDeps.length > 0 || rateLimitPatterns.length > 0 || captchaDeps.length > 0;
    const evidence = [];
    if (rateLimitDeps.length > 0)
        evidence.push(`Rate limiting libraries: ${rateLimitDeps.join(', ')}`);
    if (rateLimitPatterns.length > 0)
        evidence.push(`Rate limit patterns: ${rateLimitPatterns.slice(0, 3).join(', ')}`);
    if (captchaDeps.length > 0)
        evidence.push(`Anti-automation: ${captchaDeps.join(', ')}`);
    if (!passed)
        evidence.push('No anti-automation or rate limiting controls detected');
    return {
        id: '5.3.1',
        name: 'Verify anti-automation controls exist',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV5_4_1(rootDir) {
    const contentTypePatterns = scanFilesForPattern(rootDir, /(content.?type|Content.?Type|ContentType|contentType|application\/json|application\/xml|multipart|text\/plain|text\/html|accept.*header|ContentNegotiation)/i);
    const contentTypeValidation = scanFilesForPattern(rootDir, /(validateContentType|checkContentType|allowedContentTypes|contentType.*valid|mime.*type.*valid|accept.*type)/i);
    const passed = contentTypePatterns.length > 0 || contentTypeValidation.length > 0;
    const evidence = [];
    if (contentTypeValidation.length > 0)
        evidence.push(`Content-Type validation: ${contentTypeValidation.slice(0, 3).join(', ')}`);
    if (contentTypePatterns.length > 0)
        evidence.push(`Content-Type handling: ${contentTypePatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No content-type validation detected');
    return { id: '5.4.1', name: 'Verify content-type validation is enforced', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV5_5_1(rootDir) {
    const methodPatterns = scanFilesForPattern(rootDir, /(app\.(get|post|put|delete|patch|options|head)|router\.(get|post|put|delete|patch)|@(Get|Post|Put|Delete|Patch|Options|Head))/i);
    const methodGuard = scanFilesForPattern(rootDir, /(method.*allow|allow.*method|allowedMethods|cors.*method|corsOptions|methodNotAllowed)/i);
    const passed = methodPatterns.length > 0 && methodGuard.length > 0;
    const evidence = [];
    if (methodPatterns.length > 0)
        evidence.push(`HTTP method routing: ${methodPatterns.slice(0, 3).join(', ')}`);
    if (methodGuard.length > 0)
        evidence.push(`Method allowlisting: ${methodGuard.slice(0, 3).join(', ')}`);
    if (!passed && methodPatterns.length > 0)
        evidence.push('Methods detected but without method allowlisting');
    if (!passed && methodPatterns.length === 0)
        evidence.push('No HTTP method validation detected');
    return { id: '5.5.1', name: 'Verify HTTP method validation', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV5_6_1(rootDir) {
    const allowlistPatterns = scanFilesForPattern(rootDir, /(allowlist|whitelist|allow.?list|permit|allowed|permissible|accept.*only|const.*allow|enum|allowedValues|validValues|ALLOWED)/i);
    const positivePatterns = scanFilesForPattern(rootDir, /(new\s+Set|Set\.has|\.includes|\.some|\.every|test.*regex|match.*regex|startsWith|endsWith|indexOf.*!==)/i);
    const passed = allowlistPatterns.length > 0 || positivePatterns.length > 0;
    const evidence = [];
    if (allowlistPatterns.length > 0)
        evidence.push(`Allowlist patterns: ${allowlistPatterns.slice(0, 3).join(', ')}`);
    if (positivePatterns.length > 0)
        evidence.push(`Positive validation patterns: ${positivePatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No positive allowlist validation detected');
    return { id: '5.6.1', name: 'Verify positive allowlist validation', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function checkV5_7_1(rootDir) {
    const canonicalPatterns = scanFilesForPattern(rootDir, /(canonical|canonicalize|normalize|normaliz|decodeURIComponent|encodeURI|encodeURIComponent|path.?normalize|normalizePath)/i);
    const beforeValidPatterns = scanFilesForPattern(rootDir, /(normalize.*before|sanitize.*before|decode.*before|unescape.*before|trim.*before|strip.*before)/i);
    const passed = canonicalPatterns.length > 0;
    const evidence = [];
    if (canonicalPatterns.length > 0)
        evidence.push(`Canonicalization: ${canonicalPatterns.slice(0, 3).join(', ')}`);
    if (beforeValidPatterns.length > 0)
        evidence.push(`Pre-validation normalization: ${beforeValidPatterns.slice(0, 2).join(', ')}`);
    if (!passed)
        evidence.push('No canonicalization before validation detected');
    return { id: '5.7.1', name: 'Verify canonicalization before validation', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function checkV5_8_1(rootDir) {
    const serialValidPatterns = scanFilesForPattern(rootDir, /(JSON\.parse|JSON\.stringify|serialize|deserializ|unserialize|parse|stringify)/i);
    const safeParse = scanFilesForPattern(rootDir, /(parse.*safe|safeParse|safe.*parse|tryParse|try.*parse|z\.string.*parse|z\.object.*parse|JSON\.parse.*try|try.*JSON\.parse)/i);
    const passed = serialValidPatterns.length > 0 && safeParse.length > 0;
    const evidence = [];
    if (safeParse.length > 0)
        evidence.push(`Safe parsing: ${safeParse.slice(0, 3).join(', ')}`);
    if (serialValidPatterns.length > 0 && safeParse.length === 0)
        evidence.push('Serialization found without safe parsing patterns');
    if (!passed)
        evidence.push('No validation of serialized data structures detected');
    return { id: '5.8.1', name: 'Verify validation of serialized data structures', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function runAllV5Checks(rootDir) {
    return [
        checkV5_1_1(rootDir),
        checkV5_1_2(rootDir),
        checkV5_2_1(rootDir),
        checkV5_2_2(rootDir),
        checkV5_3_1(rootDir),
        checkV5_4_1(rootDir),
        checkV5_5_1(rootDir),
        checkV5_6_1(rootDir),
        checkV5_7_1(rootDir),
        checkV5_8_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v5-validation.js.map