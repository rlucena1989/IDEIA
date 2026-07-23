import { reviewCommand, runner } from '../review';

jest.mock('../../utils/review/index');
import { runReview } from '../../utils/review/index';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (runReview as jest.Mock).mockReturnValue({ summary: { critical: 0 }, findings: [] });
});

describe('runner', () => {
  it('deve executar revisao anti-slop', () => {
    runner(['anti-slop'])({});
    expect(runReview).toHaveBeenCalledWith(['anti-slop'], expect.any(String), false);
  });

  it('deve passar opcao json', () => {
    runner(['security'])({ json: true });
    expect(runReview).toHaveBeenCalledWith(['security'], expect.any(String), true);
  });

  it('deve chamar process.exit se houver criticos', () => {
    (runReview as jest.Mock).mockReturnValue({ summary: { critical: 2 }, findings: [] });
    runner(['all'])({});
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe('reviewCommand', () => {
  it('should be defined', () => {
    expect(reviewCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = reviewCommand();
    expect(cmd.name()).toBe('review');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('anti-slop');
    expect(names).toContain('regression');
    expect(names).toContain('security');
    expect(names).toContain('performance');
    expect(names).toContain('all');
  });
});
