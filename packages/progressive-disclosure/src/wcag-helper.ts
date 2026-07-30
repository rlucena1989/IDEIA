import { createLogger } from '@ideia/logger';
import { WCAGViolation, A11yCheckResult, FocusTrapConfig, ScreenReaderAnnouncement, SkipNavLink, RULES } from './wcag-types';

const log = createLogger('progressive-disclosure:wcag-helper');

export class WCAGHelper {
  checkAccessibility(content: string): A11yCheckResult {
    const violations: WCAGViolation[] = [];
    for (const rule of RULES) {
      try { violations.push(...rule.check(content)); } catch (err) { log.warn(`Rule ${rule.id} failed: ${err}`); }
    }
    const score = Math.max(0, 100 - violations.reduce((penalty, v) => {
      const impactPenalty = v.impact === 'critical' ? 20 : v.impact === 'serious' ? 10 : v.impact === 'moderate' ? 5 : 2;
      return penalty + impactPenalty;
    }, 0));
    return { violations, score, passed: score >= 80, timestamp: new Date().toISOString() };
  }

  generateFix(violation: WCAGViolation): string {
    const fixes: Record<string, string> = {
      'color-contrast': `/* Increase color contrast */\n/* Current: ${violation.element} */\n/* Recommendation: Ensure contrast ratio ≥ 4.5:1 for AA compliance */`,
      'image-alt': `<img src="${violation.element}" alt="[Descriptive text about ${violation.element}]" />`,
      'heading-order': `<!-- Fix heading order -->\n<!-- ${violation.element} → use correct heading level -->`,
      'label-input': `<label for="${violation.element}">[Label text]</label>\n<input id="${violation.element}" ... />`,
      'lang-attr': `<!DOCTYPE html>\n<html lang="en"> <!-- or appropriate language -->`,
      'tabindex-values': `<!-- Remove positive tabindex values -->\n<!-- Change tabindex="${violation.element}" to tabindex="0" or remove it -->`,
      'link-text': `<a href="...">[Descriptive link text]</a>`,
      'focus-visible': `/* Add visible focus indicator */\n:focus {\n  outline: 2px solid #4A90D9;\n  outline-offset: 2px;\n}`,
    };
    return fixes[violation.ruleId] || `<!-- Manual fix needed for ${violation.ruleId}: ${violation.recommendation} -->`;
  }

  createFocusTrap(config: FocusTrapConfig): { activate: () => void; deactivate: () => void } {
    let active = false;
    const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    return {
      activate: () => {
        active = true;
        const container = document.querySelector(config.container);
        if (!container) { log.warn(`Focus trap container not found: ${config.container}`); return; }
        const focusable = container.querySelectorAll(focusableSelector);
        const firstFocusable = focusable[0] as HTMLElement | undefined;
        const lastFocusable = focusable[focusable.length - 1] as HTMLElement | undefined;
        if (config.initialFocus) { const el = document.querySelector(config.initialFocus) as HTMLElement | null; el?.focus(); }
        else firstFocusable?.focus();

        const handler = (e: KeyboardEvent) => {
          if (e.key !== 'Tab' || !active) return;
          const first = firstFocusable;
          const last = lastFocusable;
          if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
          else { if (document.activeElement === last) { e.preventDefault(); first?.focus(); } }
        };
        document.addEventListener('keydown', handler);
        log.info(`Focus trap activated on ${config.container}`);
      },
      deactivate: () => {
        active = false;
        if (config.returnFocus) { const el = document.querySelector(config.returnFocus) as HTMLElement | null; el?.focus(); }
        log.info('Focus trap deactivated');
      },
    };
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (typeof document === 'undefined') { log.warn('Cannot announce: document not available'); return; }
    let announcer = document.getElementById('wcag-announcer') as HTMLElement | null;
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'wcag-announcer';
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
      document.body.appendChild(announcer);
    }
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = '';
    setTimeout(() => { if (announcer) announcer.textContent = message; }, 50);
  }

  createSkipNavLink(config: SkipNavLink): string {
    return `<a href="#${config.targetId}" class="skip-nav" id="${config.id}" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;">${config.label}</a>`;
  }

  checkKeyboardSupport(content: string): WCAGViolation[] {
    const violations: WCAGViolation[] = [];
    const hasOnClick = content.includes('onClick=') || content.includes('onclick=') || content.includes('onClick={') || content.includes('@click');
    if (hasOnClick) {
      const noKeydown = !content.includes('onKeyDown=') && !content.includes('onkeydown=') && !content.includes('onKeyDown{') && !content.includes('@keydown');
      if (noKeydown) violations.push({ ruleId: 'keyboard-support', level: 'A', element: 'Interactive element', description: 'onClick handler without keyboard event listener', impact: 'serious', recommendation: 'Add onKeyDown handler for Enter/Space keys or use a <button> element' });
    }
    return violations;
  }
}
