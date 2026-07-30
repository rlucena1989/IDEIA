"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebWizardRenderer = void 0;
exports.createWebWizardRenderer = createWebWizardRenderer;
const logger_1 = require("@ideia/logger");
const types_1 = require("./types");
const logger = (0, logger_1.createLogger)('wizard-web');
class WebWizardRenderer {
    wizard;
    constructor(wizard) {
        this.wizard = wizard;
    }
    renderStep(step, state) {
        const progressBar = this.renderProgressBar(state);
        const fields = step.fields
            .map((f) => {
            const answerRecord = state.answers.get(f.id);
            const value = answerRecord ? (answerRecord[f.id] ?? '') : '';
            const options = f.options
                ? f.options.map((o) => `<option value="${o.value}"${value === o.value ? ' selected' : ''}>${o.label}</option>`).join('')
                : '';
            const wrapper = (content) => `<div class="field"><label>${f.label}</label>${content}</div>`;
            switch (f.type) {
                case 'text':
                    return wrapper(`<input type="text" name="${f.id}" value="${String(value)}" placeholder="${f.placeholder ?? ''}" />`);
                case 'select':
                    return wrapper(`<select name="${f.id}">${options}</select>`);
                case 'multiselect':
                    return wrapper(`<div class="multiselect">${f.options?.map((o) => `<label><input type="checkbox" name="${f.id}" value="${o.value}"${(value ?? []).includes(o.value) ? ' checked' : ''} /> ${o.label}</label>`).join('')}</div>`);
                case 'toggle':
                    return wrapper(`<label class="toggle"><input type="checkbox" name="${f.id}"${value ? ' checked' : ''} /> <span class="toggle-label">${f.label}</span></label>`);
                case 'number':
                    return wrapper(`<input type="number" name="${f.id}" value="${String(value)}" />`);
                case 'slider':
                    return wrapper(`<input type="range" name="${f.id}" min="0" max="2" step="0.1" value="${String(value)}" />`);
                default:
                    return '';
            }
        })
            .join('\n');
        return `<div class="wizard-step">
  ${progressBar}
  <h2>${step.title}</h2>
  <p class="step-description">${step.description}</p>
  <div class="step-fields">${fields}</div>
</div>`;
    }
    renderSummary(state) {
        const answers = Object.entries(state.answers)
            .map(([key, val]) => `<tr><td>${key}</td><td>${Array.isArray(val) ? val.join(', ') : String(val)}</td></tr>`)
            .join('\n');
        return `<div class="wizard-summary"><h2>Summary</h2><table>${answers}</table></div>`;
    }
    getProgress(state) {
        const total = this.wizard.getSteps().length;
        return total > 0 ? ((state.currentStep + 1) / total) * 100 : 0;
    }
    renderProgressBar(state) {
        const progress = this.getProgress(state);
        const { current, total } = this.wizard.getProgress();
        return `<div class="progress-bar">
  <div class="progress-fill" style="width: ${progress}%"></div>
  <span class="progress-label">Step ${current} of ${total}</span>
</div>`;
    }
    renderAutonomyCard(level) {
        const option = types_1.AUTONOMY_OPTIONS.find((o) => o.value === level);
        if (!option)
            return '';
        return `<div class="autonomy-card" data-level="${level}">
  <div class="autonomy-level">${level}</div>
  <div class="autonomy-label">${option.label}</div>
  <div class="autonomy-desc">${option.description}</div>
</div>`;
    }
    renderProfileCard(profile) {
        return `<div class="profile-card" data-profile="${profile.id}">
  <div class="profile-icon">${profile.icon}</div>
  <div class="profile-name">${profile.label}</div>
  <div class="profile-desc">${profile.description}</div>
  <div class="profile-tooltip">${profile.tooltip}</div>
  <div class="profile-recommended">${profile.recommendedFor}</div>
</div>`;
    }
    generateFullPage(state) {
        const steps = this.wizard.getSteps();
        const currentStep = this.wizard.getCurrentStep();
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IDEIA Onboarding</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; margin: 0; padding: 20px; }
    .wizard-container { max-width: 720px; margin: 0 auto; }
    .wizard-step { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; margin-bottom: 16px; }
    h2 { margin: 0 0 8px; color: #f0f6fc; }
    .step-description { color: #8b949e; margin-bottom: 20px; }
    .step-fields { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: 13px; color: #8b949e; }
    .field input, .field select { padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 14px; }
    .progress-bar { background: #21262d; border-radius: 6px; height: 8px; margin-bottom: 16px; position: relative; }
    .progress-fill { background: #58a6ff; border-radius: 6px; height: 100%; transition: width 0.3s; }
    .progress-label { position: absolute; right: 0; top: -18px; font-size: 12px; color: #8b949e; }
    .profile-card, .autonomy-card { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 16px; cursor: pointer; transition: border-color 0.2s; }
    .profile-card:hover, .autonomy-card:hover { border-color: #58a6ff; }
    .wizard-summary table { width: 100%; border-collapse: collapse; }
    .wizard-summary td { padding: 8px; border-bottom: 1px solid #21262d; }
  </style>
</head>
<body>
  <div class="wizard-container">
    ${currentStep ? this.renderStep(currentStep, state) : '<div class="wizard-step"><h2>Completed</h2><p>All steps done!</p></div>'}
    <div class="step-navigation">
      <p>Step ${state.currentStep + 1} of ${steps.length}</p>
    </div>
  </div>
</body>
</html>`;
    }
}
exports.WebWizardRenderer = WebWizardRenderer;
function createWebWizardRenderer(wizard) {
    return new WebWizardRenderer(wizard);
}
//# sourceMappingURL=wizard-web.js.map