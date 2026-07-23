import { describe, it, expect } from '@jest/globals';
import { DashboardService, createDashboardService } from '../src/dashboard-service';
import { ProjectPanel, createProjectPanel } from '../src/project-panel';
import { SelfChat, createSelfChat } from '../src/self-chat';

describe('self-optimization-panel', () => {
  it('DashboardService can be constructed with no deps', () => {
    const ds = new DashboardService();
    expect(ds).toBeDefined();
  });

  it('getHealth returns health data', () => {
    const ds = new DashboardService();
    const health = ds.getHealth();
    expect(health).toBeDefined();
    expect(typeof health.overall).toBe('number');
    expect(['improving', 'worsening', 'stable']).toContain(health.trend);
  });

  it('ProjectPanel can be constructed', () => {
    const panel = new ProjectPanel();
    expect(panel).toBeDefined();
    expect(typeof panel.getProjectHealth).toBe('function');
  });

  it('SelfChat can be constructed', () => {
    const chat = new SelfChat();
    expect(chat).toBeDefined();
  });

  it('Factory functions exist', () => {
    expect(typeof createDashboardService).toBe('function');
    expect(typeof createProjectPanel).toBe('function');
    expect(typeof createSelfChat).toBe('function');
  });
});
