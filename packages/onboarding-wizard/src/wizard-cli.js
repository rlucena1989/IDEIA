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
exports.CliWizard = void 0;
exports.createCliWizard = createCliWizard;
const types_1 = require("./types");
const config_generator_1 = require("./config-generator");
const logger_1 = require("@ideia/logger");
const readline = __importStar(require("readline"));
const log = (0, logger_1.createLogger)('onboarding:wizard-cli');
class CliWizard {
    wizard;
    rl;
    constructor(wizard) {
        this.wizard = wizard;
        this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }
    async start() {
        const firstStep = this.wizard.start();
        log.info('\n\x1b[36m=== IDEIA Onboarding ===\x1b[0m\n');
        log.info('\x1b[33mWelcome! Let\'s configure your IDEIA experience.\x1b[0m\n');
        let step = firstStep;
        while (step) {
            this.renderProgressBar();
            await this.renderStep(step);
            const answers = await this.promptFields(step);
            const result = this.wizard.submitStep({ stepId: step.id, answers });
            if (result.complete)
                break;
            step = result.next;
        }
        this.rl.close();
        const summary = this.wizard.complete();
        log.info('\n\x1b[32m=== Setup Complete! ===\x1b[0m\n');
        const generator = new config_generator_1.ConfigGenerator();
        generator.generate(summary.config, summary.profile);
        log.info('CLI wizard completed');
    }
    renderAutonomyMenu() {
        return types_1.AUTONOMY_OPTIONS.map((opt, i) => `  \x1b[36m${i + 1}\x1b[0m) \x1b[1m${opt.label}\x1b[0m — ${opt.description}`).join('\n');
    }
    renderProgressBar() {
        const { current, total, percent } = this.wizard.getProgress();
        const barWidth = 30;
        const filled = Math.round((percent / 100) * barWidth);
        const empty = barWidth - filled;
        const bar = '\x1b[34m' + '█'.repeat(filled) + '\x1b[0m' + '░'.repeat(empty);
        log.info(`\n\x1b[2mProgress: [${bar}] ${current}/${total} (${percent}%)\x1b[0m\n`);
    }
    async renderStep(step) {
        log.info(`\n\x1b[1;36m[${step.id}]\x1b[0m \x1b[1m${step.title}\x1b[0m`);
        log.info(`\x1b[2m${step.description}\x1b[0m\n`);
        if (step.id === 'autonomy') {
            log.info(this.renderAutonomyMenu());
            log.info('');
        }
    }
    async promptFields(step) {
        const answers = {};
        for (const field of step.fields) {
            const required = field.required ? ' \x1b[31m(required)\x1b[0m' : '';
            const hint = field.placeholder ? ` \x1b[2m(e.g. ${field.placeholder})\x1b[0m` : '';
            const answer = await this.prompt(`\x1b[33m${field.label}\x1b[0m${required}${hint}: `);
            if (field.type === 'multiselect') {
                answers[field.id] = answer.split(',').map(s => s.trim()).filter(Boolean);
            }
            else if (field.type === 'number') {
                answers[field.id] = parseFloat(answer) || 0;
            }
            else if (field.type === 'slider') {
                answers[field.id] = parseFloat(answer) || 0.5;
            }
            else if (field.type === 'toggle') {
                answers[field.id] = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y' || answer === 'true';
            }
            else if (field.id === 'level' && step.id === 'autonomy') {
                const idx = parseInt(answer, 10) - 1;
                answers[field.id] = (idx >= 0 && idx < types_1.AUTONOMY_OPTIONS.length) ? types_1.AUTONOMY_OPTIONS[idx].value : field.defaultValue ?? 'N1';
            }
            else {
                answers[field.id] = (answer || field.defaultValue) ?? '';
            }
        }
        return answers;
    }
    prompt(question) {
        return new Promise(resolve => this.rl.question(question, resolve));
    }
}
exports.CliWizard = CliWizard;
function createCliWizard(wizard) {
    return new CliWizard(wizard);
}
//# sourceMappingURL=wizard-cli.js.map