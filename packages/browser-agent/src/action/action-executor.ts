import type { Action, ActionResult } from './action-types';
import { createLogger } from '@ideia/logger';
import type { ActiveSession } from '../controller/browser-controller';
import { buildAlternativeSelectors } from './recovery-strategies';
const logger = createLogger('action-executor');

export class ActionExecutor {
  private maxRetries = 2;

  async execute(session: ActiveSession, actions: Action[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    for (const action of actions) {
      const result = await this.executeSingle(session, action);
      results.push(result);
    }
    return results;
  }

  async executeSingle(session: ActiveSession, action: Action): Promise<ActionResult> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: Error | undefined;

    while (retries <= this.maxRetries) {
      try {
        const data = await this.performAction(session, action);
        const endTime = Date.now();
        let screenshot: string | undefined;
        try {
          screenshot = await session.screenshot();
        } catch { /* ignore screenshot errors */ }
        return {
          success: true,
          action,
          duration: endTime - startTime,
          data,
          screenshot,
          metrics: { startTime, endTime, retries },
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        retries++;
        if (retries <= this.maxRetries) {
          await this.sleep(500 * retries);
        }
      }
    }

    return {
      success: false,
      action,
      duration: Date.now() - startTime,
      error: lastError?.message ?? 'Unknown error',
      metrics: { startTime, endTime: Date.now(), retries },
    };
  }

  private async performAction(session: ActiveSession, action: Action): Promise<unknown> {
    switch (action.type) {
      case 'navigate':
        await session.navigate(action.url, action.waitUntil, action.timeout);
        return { url: action.url };

      case 'click': {
        const selectors = buildAlternativeSelectors(action.selector);
        for (const sel of selectors) {
          try {
            await session.click(sel, action.timeout, action.force);
            return { selector: action.selector };
          } catch { continue; }
        }
        throw new Error(`Failed to click: ${action.selector}`);
      }

      case 'type': {
        const selectors = buildAlternativeSelectors(action.selector);
        for (const sel of selectors) {
          try {
            await session.type(sel, action.text, action.delay);
            return { selector: action.selector, text: action.text };
          } catch { continue; }
        }
        throw new Error(`Failed to type: ${action.selector}`);
      }

      case 'scroll':
        await session.scroll(action.selector, action.x, action.y, action.direction, action.amount);
        return { selector: action.selector };

      case 'wait':
        if (action.selector) {
          await session.wait(action.selector, action.state, action.timeout);
        } else {
          await session.waitForDuration(action.duration ?? 1000);
        }
        return { waited: true };

      case 'extract':
        return session.extract(action.selector, action.property, action.attribute);

      case 'assert': {
        const passed = await session.assert(action.assertion, action.expected, action.selector, action.timeout);
        return { assertion: action.assertion, passed };
      }

      default:
        throw new Error(`Unknown action type: ${(action as Action).type}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
