import { ciCommand, ciGenerateAction, githubWorkflowContent, gitlabCiContent } from '../ci';
import { printHeader, printLine, printResult, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');
jest.mock('../detect');

import { getIO } from '../../io';
import { detectStack } from '../detect';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };
const baseStack = {
  frameworks: [], hasDockerfile: false, hasMakefile: false, hasCI: false, ports: [], ciProviders: [],
};
const mockGitHubStack = { ...baseStack, languages: ['typescript'], packageManager: 'npm', buildTool: 'typescript', testFramework: 'jest' };
const mockNonTsStack = { ...baseStack, languages: ['javascript'], packageManager: 'yarn', buildTool: 'node', testFramework: null };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (finish as jest.Mock).mockImplementation(() => {});
  (detectStack as jest.Mock).mockReturnValue(mockGitHubStack);
  mockFs.exists.mockReturnValue(false);
});

describe('githubWorkflowContent', () => {
  it('deve gerar workflow com build npm run build para typescript', () => {
    const content = githubWorkflowContent(mockGitHubStack);
    expect(content).toContain('npm run build');
    expect(content).toContain('npm test');
    expect(content).toContain('npm ci');
    expect(content).toContain('ai-devkit verify');
  });

  it('deve usar npm run build --if-present para node sem testFramework', () => {
    const content = githubWorkflowContent(mockNonTsStack);
    expect(content).toContain('npm run build --if-present');
    expect(content).toContain('npm run test --if-present');
  });

  it('deve usar yarn install para yarn', () => {
    const content = githubWorkflowContent({ ...mockNonTsStack, packageManager: 'yarn' });
    expect(content).toContain('yarn install');
  });

  it('deve usar pnpm install para pnpm', () => {
    const content = githubWorkflowContent({ ...mockNonTsStack, packageManager: 'pnpm' });
    expect(content).toContain('pnpm install');
  });
});

describe('gitlabCiContent', () => {
  it('deve gerar configuracao GitLab CI', () => {
    const content = gitlabCiContent(mockGitHubStack);
    expect(content).toContain('ai-verify');
    expect(content).toContain('npx ai-devkit verify');
    expect(content).toContain('npm run build');
  });
});

describe('ciGenerateAction', () => {
  it('deve gerar GitHub Actions', () => {
    ciGenerateAction({ github: true });
    expect(detectStack).toHaveBeenCalled();
    expect(mockFs.mkDir).toHaveBeenCalled();
    expect(mockFs.write).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith('GitHub Actions', true, expect.any(String));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve gerar GitLab CI', () => {
    ciGenerateAction({ gitlab: true });
    expect(mockFs.write).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith('GitLab CI', true, expect.any(String));
  });

  it('deve gerar ambos por padrao', () => {
    ciGenerateAction({});
    expect(mockFs.write).toHaveBeenCalledTimes(2);
  });

  it('deve pular arquivos existentes sem force', () => {
    mockFs.exists.mockReturnValue(true);
    ciGenerateAction({});
    expect(printResult).toHaveBeenCalledWith('GitHub Actions', false, expect.stringContaining('ja existe'));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('deve sobrescrever com force', () => {
    mockFs.exists.mockReturnValue(true);
    ciGenerateAction({ force: true });
    expect(mockFs.write).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith('GitHub Actions', true, expect.any(String));
  });

  it('deve executar dry-run sem escrever', () => {
    ciGenerateAction({ dryRun: true });
    expect(mockFs.mkDir).not.toHaveBeenCalled();
    expect(mockFs.write).not.toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN]'));
  });
});

describe('ciCommand', () => {
  it('should be defined', () => {
    expect(ciCommand).toBeDefined();
  });

  it('should return Command with generate subcommand', () => {
    const cmd = ciCommand();
    expect(cmd.name()).toBe('ci');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('generate');
  });
});
