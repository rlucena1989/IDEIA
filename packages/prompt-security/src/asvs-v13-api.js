"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV13_1_1 = checkV13_1_1;
exports.checkV13_1_2 = checkV13_1_2;
exports.checkV13_1_3 = checkV13_1_3;
exports.checkV13_2_1 = checkV13_2_1;
exports.checkV13_2_2 = checkV13_2_2;
exports.checkV13_3_1 = checkV13_3_1;
exports.checkV13_3_2 = checkV13_3_2;
exports.checkV13_4_1 = checkV13_4_1;
exports.runAllV13Checks = runAllV13Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v13-api');
const CATEGORY = 'V13';
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
                else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                    try {
                        const content = node_fs_1.default.readFileSync(full, 'utf8');
                        const match = content.match(pattern);
                        if (match) {
                            const relative = node_path_1.default.relative(rootDir, full);
                            results.push(`${relative}: ${match[0].slice(0, 100)}`);
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
function checkV13_1_1(rootDir) {
    const apiAuthDeps = scanPackageJsonDeps(rootDir, ['passport', 'passport-jwt', 'passport-http', 'jsonwebtoken', 'jose', '@nestjs/passport', 'express-jwt', 'jwt-decode', 'next-auth', 'remix-auth']);
    const apiAuthPatterns = scanFilesForPattern(rootDir, /(authenticate|authorize|AuthGuard|@UseGuards|jwt|JWT|token.*verify|verifyToken|verifyJwt)/i);
    const passed = apiAuthDeps.length > 0 || apiAuthPatterns.length > 0;
    const evidence = [];
    if (apiAuthDeps.length > 0)
        evidence.push(`API auth deps: ${apiAuthDeps.slice(0, 4).join(', ')}`);
    if (apiAuthPatterns.length > 0)
        evidence.push(`API auth patterns: ${apiAuthPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No API authentication detected');
    return { id: '13.1.1', name: 'Verify API authentication is implemented', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV13_1_2(rootDir) {
    const authzPatterns = scanFilesForPattern(rootDir, /(authorize|Authorization|@RequireRole|@Role|@HasRole|@Permission|hasRole|hasPermission|canActivate|ability|AbilityGuard|@UseGuards.*Role|roleGuard|RoleGuard)/i);
    const authzDeps = scanPackageJsonDeps(rootDir, ['casl', 'casbin', 'accesscontrol', '@casl/ability', '@casl/prisma']);
    const passed = authzPatterns.length > 0 || authzDeps.length > 0;
    const evidence = [];
    if (authzDeps.length > 0)
        evidence.push(`AuthZ deps: ${authzDeps.join(', ')}`);
    if (authzPatterns.length > 0)
        evidence.push(`API authZ patterns: ${authzPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No API authorization detected');
    return { id: '13.1.2', name: 'Verify API authorization is enforced', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV13_1_3(rootDir) {
    const validationDeps = scanPackageJsonDeps(rootDir, ['zod', 'joi', 'yup', 'ajv', 'class-validator', 'class-transformer', '@sinclair/typebox']);
    const apiValidationPatterns = scanFilesForPattern(rootDir, /(@Body|@Query|@Param|@Headers).*validation|validate.*dto|dto.*validate|Pipe|ValidationPipe|ParseIntPipe|ParseUUIDPipe|ParseBoolPipe|ParseArrayPipe/i);
    const zodApiSchemas = scanFilesForPattern(rootDir, /z\.object\(\{[^}]*\}[^)]*\)/);
    const passed = validationDeps.length > 0 || apiValidationPatterns.length > 0 || zodApiSchemas.length > 0;
    const evidence = [];
    if (validationDeps.length > 0)
        evidence.push(`Validation deps: ${validationDeps.slice(0, 4).join(', ')}`);
    if (apiValidationPatterns.length > 0)
        evidence.push(`API validation: ${apiValidationPatterns.slice(0, 3).join(', ')}`);
    if (zodApiSchemas.length > 0)
        evidence.push(`Zod schemas: ${zodApiSchemas.slice(0, 2).join(', ')}`);
    if (!passed)
        evidence.push('No API input validation detected');
    return { id: '13.1.3', name: 'Verify API input validation is implemented', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV13_2_1(rootDir) {
    const restPatterns = scanFilesForPattern(rootDir, /(@Get|@Post|@Put|@Delete|@Patch|@RequestMapping|GET|POST|PUT|DELETE|PATCH|router\.(get|post|put|delete|patch))/i);
    const restSecurity = scanFilesForPattern(rootDir, /(helmet|cors|CORS|corsOptions|corsMiddleware|rateLimit|throttle|content.?type.?valid|accept.*header)/i);
    const passed = restPatterns.length > 0 && restSecurity.length > 0;
    const evidence = [];
    if (restPatterns.length > 0)
        evidence.push(`REST endpoints: ${restPatterns.slice(0, 3).join(', ')}`);
    if (restSecurity.length > 0)
        evidence.push(`REST security: ${restSecurity.slice(0, 3).join(', ')}`);
    if (!passed && restPatterns.length > 0)
        evidence.push('REST detected but without security headers/middleware');
    if (!passed && restPatterns.length === 0)
        evidence.push('No RESTful service security detected');
    return { id: '13.2.1', name: 'Verify RESTful service security', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV13_2_2(rootDir) {
    const soapPatterns = scanFilesForPattern(rootDir, /(soap|SOAP|xml.?rpc|wsdl|WSDL|\.xsd|XSD|soap.*envelope|Envelope|xmlns.*soap)/i);
    const xmlSecurity = scanFilesForPattern(rootDir, /(xxe|XML.?parser|libxml|fast-xml-parser|xml2js|xmlbuilder|xml.*valid|xml.*sanitize|xml.*secure)/i);
    const passed = soapPatterns.length === 0 || (soapPatterns.length > 0 && xmlSecurity.length > 0);
    const evidence = [];
    if (soapPatterns.length > 0)
        evidence.push(`SOAP patterns: ${soapPatterns.slice(0, 3).join(', ')}`);
    if (xmlSecurity.length > 0)
        evidence.push(`XML security: ${xmlSecurity.slice(0, 3).join(', ')}`);
    if (soapPatterns.length === 0)
        evidence.push('No SOAP services detected');
    if (soapPatterns.length > 0 && xmlSecurity.length === 0)
        evidence.push('SOAP services found without XML security');
    return { id: '13.2.2', name: 'Verify SOAP service security', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV13_3_1(rootDir) {
    const versionPatterns = scanFilesForPattern(rootDir, /(v1\/|v2\/|v3\/|api\/v\d|version|apiVersion|@Version|api.*version)/i);
    const apiVersionDeps = scanPackageJsonDeps(rootDir, ['express-version-route', 'express-version', '@nestjs/common']);
    const passed = versionPatterns.length > 0 || apiVersionDeps.length > 0;
    const evidence = [];
    if (versionPatterns.length > 0)
        evidence.push(`Version patterns: ${versionPatterns.slice(0, 3).join(', ')}`);
    if (apiVersionDeps.length > 0)
        evidence.push(`Versioning deps: ${apiVersionDeps.join(', ')}`);
    if (!passed)
        evidence.push('No API versioning detected');
    return { id: '13.3.1', name: 'Verify API versioning is implemented', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV13_3_2(rootDir) {
    const rateLimitDeps = scanPackageJsonDeps(rootDir, ['express-rate-limit', 'rate-limiter-flexible', 'bottleneck', 'p-limit', 'async-sema', '@nestjs/throttler', 'throttler']);
    const rateLimitPatterns = scanFilesForPattern(rootDir, /(rateLimit|rate.?limit|throttle|ThrottlerGuard|@Throttle|rateLimit|RateLimiter|rate_limit)/i);
    const passed = rateLimitDeps.length > 0 || rateLimitPatterns.length > 0;
    const evidence = [];
    if (rateLimitDeps.length > 0)
        evidence.push(`Rate limit deps: ${rateLimitDeps.join(', ')}`);
    if (rateLimitPatterns.length > 0)
        evidence.push(`Rate limit config: ${rateLimitPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No API rate limiting detected');
    return { id: '13.3.2', name: 'Verify API rate limiting is enforced', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV13_4_1(rootDir) {
    const apiErrorPatterns = scanFilesForPattern(rootDir, /(error.*response|error.*handler.*api|api.*error|ApiError|ApiException|HttpException|@Catch|ExceptionFilter|exception.*filter|error.*dto|error.*schema)/i);
    const consistentErrors = scanFilesForPattern(rootDir, /(status\(\d{3}\)\.json|throw.*HttpException|throw.*BadRequest|throw.*Unauthorized|throw.*Forbidden|throw.*NotFound|throw.*Conflict)/i);
    const passed = apiErrorPatterns.length > 0 || consistentErrors.length > 0;
    const evidence = [];
    if (apiErrorPatterns.length > 0)
        evidence.push(`API error patterns: ${apiErrorPatterns.slice(0, 3).join(', ')}`);
    if (consistentErrors.length > 0)
        evidence.push(`Consistent errors: ${consistentErrors.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No consistent API error handling detected');
    return { id: '13.4.1', name: 'Verify API error handling is consistent and secure', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function runAllV13Checks(rootDir) {
    return [
        checkV13_1_1(rootDir),
        checkV13_1_2(rootDir),
        checkV13_1_3(rootDir),
        checkV13_2_1(rootDir),
        checkV13_2_2(rootDir),
        checkV13_3_1(rootDir),
        checkV13_3_2(rootDir),
        checkV13_4_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v13-api.js.map