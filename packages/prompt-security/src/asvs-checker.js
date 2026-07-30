"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsvsChecker = void 0;
exports.formatAsvsReport = formatAsvsReport;
const asvs_types_1 = require("./asvs-types");
const asvs_v1_architecture_1 = require("./asvs-v1-architecture");
const asvs_v2_auth_1 = require("./asvs-v2-auth");
const asvs_v3_session_1 = require("./asvs-v3-session");
const asvs_v4_access_control_1 = require("./asvs-v4-access-control");
const asvs_v5_validation_1 = require("./asvs-v5-validation");
const asvs_v6_crypto_1 = require("./asvs-v6-crypto");
const asvs_v7_errors_1 = require("./asvs-v7-errors");
const asvs_v8_data_1 = require("./asvs-v8-data");
const asvs_v9_comm_1 = require("./asvs-v9-comm");
const asvs_v10_malicious_1 = require("./asvs-v10-malicious");
const asvs_v11_logic_1 = require("./asvs-v11-logic");
const asvs_v12_files_1 = require("./asvs-v12-files");
const asvs_v13_api_1 = require("./asvs-v13-api");
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('asvs-checker');
const CATEGORY_RUNNERS = {
    V1: asvs_v1_architecture_1.runAllV1Checks,
    V2: asvs_v2_auth_1.runAllV2Checks,
    V3: asvs_v3_session_1.runAllV3Checks,
    V4: asvs_v4_access_control_1.runAllV4Checks,
    V5: asvs_v5_validation_1.runAllV5Checks,
    V6: asvs_v6_crypto_1.runAllV6Checks,
    V7: asvs_v7_errors_1.runAllV7Checks,
    V8: asvs_v8_data_1.runAllV8Checks,
    V9: asvs_v9_comm_1.runAllV9Checks,
    V10: asvs_v10_malicious_1.runAllV10Checks,
    V11: asvs_v11_logic_1.runAllV11Checks,
    V12: asvs_v12_files_1.runAllV12Checks,
    V13: asvs_v13_api_1.runAllV13Checks,
};
class AsvsChecker {
    rootDir;
    constructor(rootDir) {
        this.rootDir = rootDir ?? process.cwd();
    }
    runAll() {
        log.info('Running all ASVS L1-L3 checks');
        const categories = this.runCategories(Object.keys(CATEGORY_RUNNERS));
        return this.buildReport(categories);
    }
    runCategories(selected) {
        const results = [];
        for (const category of selected) {
            const runner = CATEGORY_RUNNERS[category];
            if (!runner)
                continue;
            const checks = runner(this.rootDir);
            const passed = checks.filter(c => c.passed);
            results.push({
                category,
                name: asvs_types_1.ASVS_CATEGORIES[category] || category,
                total: checks.length,
                passed: passed.length,
                checks,
            });
        }
        return results;
    }
    buildReport(categories) {
        const allChecks = categories.flatMap(c => c.checks);
        const l1Checks = allChecks.filter(c => c.level === 1);
        const l1Passed = l1Checks.filter(c => c.passed);
        const l2Checks = allChecks.filter(c => c.level === 2);
        const l2Passed = l2Checks.filter(c => c.passed);
        const l3Checks = allChecks.filter(c => c.level === 3);
        const l3Passed = l3Checks.filter(c => c.passed);
        const total = allChecks.length;
        const passed = allChecks.filter(c => c.passed).length;
        return {
            summary: {
                total,
                passed,
                failed: total - passed,
                overallPercent: total > 0 ? Math.round((passed / total) * 100) : 0,
            },
            l1Summary: {
                total: l1Checks.length,
                passed: l1Passed.length,
                percent: l1Checks.length > 0 ? Math.round((l1Passed.length / l1Checks.length) * 100) : 0,
            },
            categories,
            timestamp: new Date().toISOString(),
            l2Summary: {
                total: l2Checks.length,
                passed: l2Passed.length,
                percent: l2Checks.length > 0 ? Math.round((l2Passed.length / l2Checks.length) * 100) : 0,
            },
            l3Summary: {
                total: l3Checks.length,
                passed: l3Passed.length,
                percent: l3Checks.length > 0 ? Math.round((l3Passed.length / l3Checks.length) * 100) : 0,
            },
        };
    }
}
exports.AsvsChecker = AsvsChecker;
function formatAsvsReport(report) {
    const lines = [];
    lines.push('=== OWASP ASVS Compliance Report ===');
    lines.push(`Timestamp: ${report.timestamp}`);
    lines.push('');
    lines.push(`L1 Summary: ${report.l1Summary.passed}/${report.l1Summary.total} checks passed (${report.l1Summary.percent}%)`);
    lines.push(`L2 Summary: ${report.l2Summary.passed}/${report.l2Summary.total} checks passed (${report.l2Summary.percent}%)`);
    lines.push(`L3 Summary: ${report.l3Summary.passed}/${report.l3Summary.total} checks passed (${report.l3Summary.percent}%)`);
    lines.push(`Overall: ${report.summary.passed}/${report.summary.total} checks passed (${report.summary.overallPercent}%)`);
    lines.push('');
    for (const cat of report.categories) {
        const pct = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0;
        lines.push(`${cat.category} — ${cat.name}: ${cat.passed}/${cat.total} (${pct}%)`);
        for (const check of cat.checks) {
            const icon = check.passed ? '[PASS]' : '[FAIL]';
            lines.push(`  ${icon} [L${check.level}] ${check.id} — ${check.name}`);
            lines.push(`    Evidence: ${check.evidence}`);
        }
        lines.push('');
    }
    const failed = report.categories.flatMap(c => c.checks).filter(c => !c.passed);
    if (failed.length > 0) {
        lines.push('Failed Checks:');
        for (const f of failed) {
            lines.push(`  [L${f.level}][${f.category}] ${f.id} — ${f.name}`);
        }
        lines.push('');
    }
    lines.push('========================================');
    return lines.join('\n');
}
//# sourceMappingURL=asvs-checker.js.map