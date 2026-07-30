"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV1_1_1 = checkV1_1_1;
exports.checkV1_1_2 = checkV1_1_2;
exports.checkV1_2_1 = checkV1_2_1;
exports.checkV1_4_1 = checkV1_4_1;
exports.checkV1_5_1 = checkV1_5_1;
exports.checkV1_6_1 = checkV1_6_1;
exports.checkV1_7_1 = checkV1_7_1;
exports.checkV1_8_1 = checkV1_8_1;
exports.runAllV1Checks = runAllV1Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v1-architecture');
const CATEGORY = 'V1';
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
                else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.md') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
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
function checkV1_1_1(rootDir) {
    const sdlcPolicies = scanFilesForPattern(rootDir, /(secure.?development.?lifecycle|SDLC|security.?policy|secure.?coding.?standard|security.?requirement|security.?guideline)/i);
    const docsPatterns = scanFilesForPattern(rootDir, /(security.?policy|SECURITY\.md|CONTRIBUTING|security.?audit)/i);
    const passed = sdlcPolicies.length > 0 || docsPatterns.length > 0;
    const evidence = [];
    if (sdlcPolicies.length > 0)
        evidence.push(`SDLC policies: ${sdlcPolicies.slice(0, 3).join(', ')}`);
    if (docsPatterns.length > 0)
        evidence.push(`Security docs: ${docsPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No secure development lifecycle evidence found');
    return { id: '1.1.1', name: 'Verify secure development lifecycle exists', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV1_1_2(rootDir) {
    const threatModels = scanFilesForPattern(rootDir, /(threat.?model|threat.?modeling|stride|attack.?tree|attack.?vector|risk.?assessment|risk.?matrix|danger.?model)/i);
    const securityReviews = scanFilesForPattern(rootDir, /(security.?review|architecture.?review|design.?review|threat.?analysis)/i);
    const passed = threatModels.length > 0 || securityReviews.length > 0;
    const evidence = [];
    if (threatModels.length > 0)
        evidence.push(`Threat models: ${threatModels.slice(0, 3).join(', ')}`);
    if (securityReviews.length > 0)
        evidence.push(`Security reviews: ${securityReviews.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No threat modeling for critical components detected');
    return { id: '1.1.2', name: 'Verify threat modeling for critical components', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV1_2_1(rootDir) {
    const archDocs = scanFilesForPattern(rootDir, /(architecture|arch\.md|ARCHITECTURE|C4.?diagram|component.?diagram|deployment.?diagram|system.?design|system.?architecture|ADR-\d{3}|adr-\d{3}|decision.?record)/i);
    const securityArch = scanFilesForPattern(rootDir, /(security.?architecture|security.?design|security.?control|security.?layer|trust.?boundary|security.?zones)/i);
    const passed = archDocs.length > 0;
    const evidence = [];
    if (archDocs.length > 0)
        evidence.push(`Architecture docs: ${archDocs.slice(0, 3).join(', ')}`);
    if (securityArch.length > 0)
        evidence.push(`Security architecture: ${securityArch.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No security architecture documentation found');
    return { id: '1.2.1', name: 'Verify security architecture documentation exists', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV1_4_1(rootDir) {
    const separationPatterns = scanFilesForPattern(rootDir, /(tier|layer|n.?tier|microservice|service.?layer|presentation.?layer|business.?layer|data.?layer|separation.?of.?concern|concern.?separation)/i);
    const nginxConfigs = scanFilesForPattern(rootDir, /(upstream|proxy_pass|reverse.?proxy|api.?gateway|gateway|load.?balanc)/i);
    const passed = separationPatterns.length > 0 || nginxConfigs.length > 0;
    const evidence = [];
    if (separationPatterns.length > 0)
        evidence.push(`Component separation: ${separationPatterns.slice(0, 3).join(', ')}`);
    if (nginxConfigs.length > 0)
        evidence.push(`Gateway/proxy: ${nginxConfigs.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No tier/component separation detected');
    return { id: '1.4.1', name: 'Verify separation of components (tier separation)', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV1_5_1(rootDir) {
    const securityReqs = scanFilesForPattern(rootDir, /(security.?requirement|security.?acceptance|criterion|NIST|ISO 27001|ISO27001|OWASP|ASVS|MASVS|PCI.?DSS|SOC.?2|require.*security)/i);
    const policyFiles = scanFilesForPattern(rootDir, /(requirement|requisito|especificação.*segurança)/i);
    const passed = securityReqs.length > 0;
    const evidence = [];
    if (securityReqs.length > 0)
        evidence.push(`Security requirements: ${securityReqs.slice(0, 4).join(', ')}`);
    if (policyFiles.length > 0)
        evidence.push(`Specifications: ${policyFiles.slice(0, 2).join(', ')}`);
    if (!passed)
        evidence.push('No security requirements for components found');
    return { id: '1.5.1', name: 'Verify security requirements for all components', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV1_6_1(rootDir) {
    const codingStandards = scanFilesForPattern(rootDir, /(secure.?coding|secure.?code|code.?standard|coding.?guideline|lint|eslint|tslint|biome|prettier|husky|lint-staged|commitlint)/i);
    const eslintConfig = scanFilesForPattern(rootDir, /(eslint\.config|\.eslintrc|biome\.json|tslint\.json|prettier\.config)/i);
    const securityPlugins = scanPackageJsonDeps(rootDir, ['eslint-plugin-security', 'eslint-plugin-no-secrets', 'eslint-plugin-unicorn', 'eslint-config-security']);
    const passed = codingStandards.length > 0 || securityPlugins.length > 0;
    const evidence = [];
    if (eslintConfig.length > 0)
        evidence.push(`Linter configs: ${eslintConfig.slice(0, 3).join(', ')}`);
    if (securityPlugins.length > 0)
        evidence.push(`Security linter plugins: ${securityPlugins.join(', ')}`);
    if (codingStandards.length > 0)
        evidence.push(`Coding standard tools: ${codingStandards.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No secure coding standards detected');
    return { id: '1.6.1', name: 'Verify secure coding standards exist', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV1_7_1(rootDir) {
    const changeMgmt = scanFilesForPattern(rootDir, /(change.?review|change.?management|PR.?template|pull.?request.?template|CODEOWNERS|code.?review|review.?process|security.?impact|change.?log|CHANGELOG)/i);
    const ciSecurity = scanFilesForPattern(rootDir, /(CI|CD|pipeline|github.?actions|gitlab.?ci|jenkins|circleci|workflow.*security|security.*scan|security.*check)/i);
    const passed = changeMgmt.length > 0 || ciSecurity.length > 0;
    const evidence = [];
    if (changeMgmt.length > 0)
        evidence.push(`Change management: ${changeMgmt.slice(0, 3).join(', ')}`);
    if (ciSecurity.length > 0)
        evidence.push(`CI security checks: ${ciSecurity.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No security change impact analysis found');
    return { id: '1.7.1', name: 'Verify security implications of all changes are reviewed', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function checkV1_8_1(rootDir) {
    const componentInventory = scanFilesForPattern(rootDir, /(component.?inventory|asset.?inventory|service.?catalog|service.?registry|dependency.?graph|sbom|software.?bill.?of.?materials|components?\.json|service.*list|ecosystem.*catalog)/i);
    const servicesPatterns = scanFilesForPattern(rootDir, /(@ideia\/|@app\/|@core\/|@shared\/|@feature)/i);
    const passed = componentInventory.length > 0 || servicesPatterns.length > 0;
    const evidence = [];
    if (componentInventory.length > 0)
        evidence.push(`Component inventory: ${componentInventory.slice(0, 3).join(', ')}`);
    if (servicesPatterns.length > 0)
        evidence.push(`Service modules: ${servicesPatterns.slice(0, 4).join(', ')}`);
    if (!passed)
        evidence.push('No component inventory or service registry detected');
    return { id: '1.8.1', name: 'Verify all components are accounted for in architecture', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}
function runAllV1Checks(rootDir) {
    return [
        checkV1_1_1(rootDir),
        checkV1_1_2(rootDir),
        checkV1_2_1(rootDir),
        checkV1_4_1(rootDir),
        checkV1_5_1(rootDir),
        checkV1_6_1(rootDir),
        checkV1_7_1(rootDir),
        checkV1_8_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v1-architecture.js.map