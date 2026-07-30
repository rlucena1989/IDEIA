"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV12_1_1 = checkV12_1_1;
exports.checkV12_2_1 = checkV12_2_1;
exports.checkV12_3_1 = checkV12_3_1;
exports.checkV12_3_2 = checkV12_3_2;
exports.checkV12_4_1 = checkV12_4_1;
exports.checkV12_5_1 = checkV12_5_1;
exports.checkV12_6_1 = checkV12_6_1;
exports.runAllV12Checks = runAllV12Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v12-files');
const CATEGORY = 'V12';
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
function checkV12_1_1(rootDir) {
    const uploadDeps = scanPackageJsonDeps(rootDir, ['multer', 'formidable', 'busboy', 'express-fileupload', 'file-type', 'file-type-mime', 'magic-bytes.js']);
    const uploadPatterns = scanFilesForPattern(rootDir, /(upload|file.*upload|multer|formidable|busboy|fileUpload|FileInterceptor|@UploadedFile|UploadedFiles)/i);
    const uploadValidation = scanFilesForPattern(rootDir, /(file.*valid|file.*type|file.*ext|file.*mime|file.*size|file.*limit|file.*sanitize|file_type|allowed.*(ext|mime|type)|extension.*check)/i);
    const passed = uploadDeps.length > 0 || (uploadPatterns.length > 0 && uploadValidation.length > 0);
    const evidence = [];
    if (uploadDeps.length > 0)
        evidence.push(`File upload libraries: ${uploadDeps.slice(0, 4).join(', ')}`);
    if (uploadPatterns.length > 0)
        evidence.push(`Upload patterns: ${uploadPatterns.slice(0, 3).join(', ')}`);
    if (uploadValidation.length > 0)
        evidence.push(`Upload validation: ${uploadValidation.slice(0, 3).join(', ')}`);
    if (!passed && uploadPatterns.length > 0)
        evidence.push('Upload detected but without file type/extension validation');
    if (!passed && uploadPatterns.length === 0)
        evidence.push('No file upload validation mechanisms detected');
    return {
        id: '12.1.1',
        name: 'Verify file upload validation exists (type, extension, content)',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV12_2_1(rootDir) {
    const avPatterns = scanFilesForPattern(rootDir, /(antivirus|anti.?virus|virus.*scan|malware.*scan|scan.*upload|upload.*scan|clamav|clamAV|ClamAV|file.*scan|scan.*file|content.*scan|scan.*content|malware.*detect)/i);
    const avDeps = scanPackageJsonDeps(rootDir, ['clamscan', 'clam.js', 'clamav.js', 'node-clam', 'virus-scan']);
    const passed = avPatterns.length > 0 || avDeps.length > 0;
    const evidence = [];
    if (avDeps.length > 0)
        evidence.push(`Antivirus libraries: ${avDeps.join(', ')}`);
    if (avPatterns.length > 0)
        evidence.push(`Antivirus patterns: ${avPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No antivirus/malware scanning of uploads detected');
    return { id: '12.2.1', name: 'Verify antivirus/malware scanning of uploads', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV12_3_1(rootDir) {
    const sizeLimitPatterns = scanFilesForPattern(rootDir, /(file.*size|max.*size|size.*limit|maxSize|maxFileSize|upload.*limit|limit.*upload|100MB|10MB|50MB|maxFiles|maxFileCount)/i);
    const multerLimit = scanFilesForPattern(rootDir, /(limits:\s*\{[^}]*fileSize|fileSize:\s*\d+|limits:\s*\{[^}]*files)/i);
    const nginxLimit = scanFilesForPattern(rootDir, /(client_max_body_size|client_body_timeout|proxy_request_buffering)/i);
    const passed = sizeLimitPatterns.length > 0 || multerLimit.length > 0 || nginxLimit.length > 0;
    const evidence = [];
    if (multerLimit.length > 0)
        evidence.push(`Multer size limits: ${multerLimit.slice(0, 3).join(', ')}`);
    if (sizeLimitPatterns.length > 0)
        evidence.push(`Size limit config: ${sizeLimitPatterns.slice(0, 3).join(', ')}`);
    if (nginxLimit.length > 0)
        evidence.push(`Nginx limits: ${nginxLimit.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No file upload size limits detected');
    return {
        id: '12.3.1',
        name: 'Verify file upload size limits are enforced',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV12_3_2(rootDir) {
    const uploadDirPatterns = scanFilesForPattern(rootDir, /(upload.*dir|upload.*path|upload.*folder|uploads?\/|uploads?.{0,20}path|storage.*dir|storage.*path)/i);
    const nonExecPatterns = scanFilesForPattern(rootDir, /(chmod|permission|executable|execute.*perm|upload.*outside|outside.*web|outside.*root|non.?execut|no.?execut|remove.*execut)/i);
    const passed = nonExecPatterns.length > 0;
    const evidence = [];
    if (uploadDirPatterns.length > 0)
        evidence.push(`Upload directory: ${uploadDirPatterns.slice(0, 3).join(', ')}`);
    if (nonExecPatterns.length > 0)
        evidence.push(`Non-executable permissions: ${nonExecPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No upload directory non-executable permission detected');
    return { id: '12.3.2', name: 'Verify upload directory is not executable', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV12_4_1(rootDir) {
    const contentValid = scanFilesForPattern(rootDir, /(file.?content.*valid|content.*valid.*file|magic.*bytes|magicBytes|file.?signature|signature.*file|header.*valid.*file|file.*header|content.*type.*file|mime.*type.*check|mime.*detect|fileType|file_type)/i);
    const contentDeps = scanPackageJsonDeps(rootDir, ['file-type', 'file-type-mime', 'magic-bytes.js', 'mime-types', 'mime']);
    const passed = contentValid.length > 0 || contentDeps.length > 0;
    const evidence = [];
    if (contentDeps.length > 0)
        evidence.push(`Content detection libs: ${contentDeps.join(', ')}`);
    if (contentValid.length > 0)
        evidence.push(`Content validation: ${contentValid.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No file content validation (magic bytes) detected');
    return { id: '12.4.1', name: 'Verify file content validation using magic bytes', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV12_5_1(rootDir) {
    const reencodePatterns = scanFilesForPattern(rootDir, /(re.?encod|re-?encod|recompres|re.?compress|convert.*image|image.*convert|resize.*image|image.*resize|transform.*image|image.*transform|sharp|jimp|gm|graphicsMagick|imagemagick|image.*process|process.*image)/i);
    const passed = reencodePatterns.length > 0;
    const evidence = [];
    if (reencodePatterns.length > 0)
        evidence.push(`Image re-encoding: ${reencodePatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No image/content re-encoding on upload detected');
    return { id: '12.5.1', name: 'Verify image/content re-encoding on upload', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function checkV12_6_1(rootDir) {
    const uploadRateLimit = scanFilesForPattern(rootDir, /(upload.*rate|rate.*upload|upload.*limit|limit.*upload|upload.*throttle|throttle.*upload|upload.*max|max.*upload|upload.*burst|burst.*upload|upload.*per.*(user|minute|hour|second|day))/i);
    const passed = uploadRateLimit.length > 0;
    const evidence = [];
    if (uploadRateLimit.length > 0)
        evidence.push(`Upload rate limiting: ${uploadRateLimit.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No upload rate limiting per user detected');
    return { id: '12.6.1', name: 'Verify upload rate limiting per user', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function runAllV12Checks(rootDir) {
    return [
        checkV12_1_1(rootDir),
        checkV12_2_1(rootDir),
        checkV12_3_1(rootDir),
        checkV12_3_2(rootDir),
        checkV12_4_1(rootDir),
        checkV12_5_1(rootDir),
        checkV12_6_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v12-files.js.map