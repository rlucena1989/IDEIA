import 'jest';
import { IDEIA_DashboardCharts } from '../ideia-dashboard-charts';

describe('IDEIA_DashboardCharts', () => {
  const mockDashboardService = {
    getMetrics: jest.fn().mockResolvedValue({
      tasksCompleted: 42,
      tasksFailed: 3,
      agentsActive: 5,
      tokensUsed: 150000,
      averageScore: 85,
      violationsActive: 0,
      coveragePercent: 72,
      servicesCount: 10,
      capabilitiesCount: 15,
      studiesCount: 20,
      studiesCompleted: 18,
      studyScore: 90,
      tutorialsCompleted: 3,
      tutorialsTotal: 6,
    }),
    getTimeline: jest.fn().mockResolvedValue([]),
  };

  let widget: IDEIA_DashboardCharts;

  beforeEach(() => {
    jest.clearAllMocks();
    widget = new IDEIA_DashboardCharts(mockDashboardService as never);
  });

  it('should have static ID and LABEL', () => {
    expect(IDEIA_DashboardCharts.ID).toBe('ideia:dashboard-charts');
    expect(IDEIA_DashboardCharts.LABEL).toBe('IDEIA Charts');
  });

  it('should initialize and fetch data on init', async () => {
    await widget['init']();
    expect(mockDashboardService.getMetrics).toHaveBeenCalled();
  });

  it('should default timeRange to 1h', () => {
    expect(widget['timeRange']).toBe('1h');
  });

  it('should be a Theia widget with correct id', () => {
    expect(widget.id).toBe('ideia:dashboard-charts');
  });
});
