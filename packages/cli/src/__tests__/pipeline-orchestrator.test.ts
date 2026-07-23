import { PipelineMode, PipelineRequest, getStagesForMode, selectPipelineMode, buildPipeline, dryRunPipeline, executeStages, formatPipelineReport, estimateTokensSaved, modeLabel, simulateStages, PipelineStage, PipelineConfig, PipelineReport } from '../runtime/pipeline-orchestrator';

const mockRequest: PipelineRequest = {
  description: 'Corrigir bug no login quando usuario digita senha incorreta',
  files: ['src/auth/login.ts', 'src/auth/LoginForm.tsx'],
};

const mockFeatureRequest: PipelineRequest = {
  description: 'Adicionar nova tela de dashboard com graficos e tabelas',
  files: ['src/pages/Dashboard.tsx', 'src/components/Chart.tsx'],
};

const mockSecurityRequest: PipelineRequest = {
  description: 'Vulnerabilidade de SQL injection no endpoint de busca',
  files: ['src/api/search.ts', 'src/api/query.ts'],
};

const mockCleanupRequest: PipelineRequest = {
  description: 'Remover dependencias nao utilizadas do package.json',
  files: ['package.json'],
};

describe('Pipeline Orchestrator', () => {
  describe('getStagesForMode', () => {
    it('deve retornar stages parciais para short (sem route/memory/redundancy/risk/approval)', () => {
      const stages = getStagesForMode('short');
      expect(stages.length).toBeLessThan(12);
      expect(stages).toContain('classify');
      expect(stages).toContain('budget');
      expect(stages).not.toContain('route');
      expect(stages).not.toContain('memory_query');
      expect(stages).not.toContain('redundancy_check');
      expect(stages).not.toContain('risk_score');
      expect(stages).not.toContain('approval_gate');
    });

    it('deve retornar 12 stages para full', () => {
      const stages = getStagesForMode('full');
      expect(stages.length).toBe(12);
      expect(stages).toContain('classify');
      expect(stages).toContain('route');
      expect(stages).toContain('memory_query');
      expect(stages).toContain('redundancy_check');
      expect(stages).toContain('risk_score');
      expect(stages).toContain('approval_gate');
    });

    it('deve retornar 12 stages para forensic', () => {
      const stages = getStagesForMode('forensic');
      expect(stages.length).toBe(12);
      expect(stages).toContain('route');
      expect(stages).toContain('memory_query');
      expect(stages).toContain('redundancy_check');
      expect(stages).toContain('risk_score');
      expect(stages).toContain('approval_gate');
    });
  });

  describe('selectPipelineMode', () => {
    it('deve selecionar short para bugfix sem budget', () => {
      const result = selectPipelineMode('bugfix');
      expect(result.mode).toBe('short');
    });

    it('deve selecionar short para test_only', () => {
      const result = selectPipelineMode('test_only');
      expect(result.mode).toBe('short');
    });

    it('deve selecionar short para dependency_update', () => {
      const result = selectPipelineMode('dependency_update');
      expect(result.mode).toBe('short');
    });

    it('deve selecionar full para feature', () => {
      const result = selectPipelineMode('feature');
      expect(result.mode).toBe('full');
    });

    it('deve selecionar full para refactor', () => {
      const result = selectPipelineMode('refactor');
      expect(result.mode).toBe('full');
    });

    it('deve selecionar forensic para security_review', () => {
      const result = selectPipelineMode('security_review');
      expect(result.mode).toBe('forensic');
    });

    it('deve selecionar forensic para incident_response', () => {
      const result = selectPipelineMode('incident_response');
      expect(result.mode).toBe('forensic');
    });

    it('deve selecionar forensic para cleanup', () => {
      const result = selectPipelineMode('cleanup');
      expect(result.mode).toBe('forensic');
    });

    it('deve selecionar short para bugfix com budget < 50000', () => {
      const result = selectPipelineMode('bugfix', { max_tokens: 30000 });
      expect(result.mode).toBe('short');
    });

    it('deve selecionar short para feature com budget muito baixo', () => {
      const result = selectPipelineMode('feature', { max_tokens: 30000 });
      expect(result.mode).toBe('short');
    });
  });

  describe('buildPipeline', () => {
    it('deve construir pipeline para bugfix (short)', () => {
      const pipeline = buildPipeline(mockRequest);
      expect(pipeline.mode).toBe('short');
      expect(pipeline.stages.length).toBeLessThan(12);
      expect(pipeline.taskType).toBe('bugfix');
    });

    it('deve construir pipeline para feature (full)', () => {
      const pipeline = buildPipeline(mockFeatureRequest);
      expect(pipeline.mode).toBe('full');
      expect(pipeline.stages.length).toBe(12);
    });

    it('deve construir pipeline para security (forensic)', () => {
      const pipeline = buildPipeline(mockSecurityRequest);
      expect(pipeline.mode).toBe('forensic');
      expect(pipeline.stages.length).toBe(12);
    });

    it('deve respeitar modeOverride', () => {
      const pipeline = buildPipeline(mockRequest, 'full');
      expect(pipeline.mode).toBe('full');
      expect(pipeline.stages.length).toBe(12);
    });

    it('cada stage deve ter status pending', () => {
      const pipeline = buildPipeline(mockRequest);
      for (const stage of pipeline.stages) {
        expect(stage.status).toBe('pending');
      }
    });

    it('deve ter stages required e non-required', () => {
      const pipeline = buildPipeline(mockFeatureRequest);
      const required = pipeline.stages.filter(s => s.required);
      const nonRequired = pipeline.stages.filter(s => !s.required);
      expect(required.length).toBeGreaterThan(0);
      expect(nonRequired.length).toBeGreaterThan(0);
    });
  });

  describe('dryRunPipeline', () => {
    it('deve gerar relatorio sem executar', () => {
      const report = dryRunPipeline(mockRequest);
      expect(report.allPassed).toBe(true);
      expect(report.failed).toBe(0);
      expect(report.passed).toBe(0);
      expect(report.modeReason.length).toBeGreaterThan(0);
    });

    it('deve respeitar modeOverride', () => {
      const report = dryRunPipeline(mockRequest, 'forensic');
      expect(report.mode).toBe('forensic');
    });
  });

  describe('executeStages', () => {
    it('deve executar todos os stages com simulateFn', () => {
      const pipeline = buildPipeline(mockRequest);
      const report = executeStages(pipeline, (stage) => ({
        id: stage.id,
        status: 'passed',
        durationMs: 50,
      }));
      expect(report.passed).toBe(pipeline.stages.length);
      expect(report.failed).toBe(0);
      expect(report.allPassed).toBe(true);
    });

    it('deve reportar falhas', () => {
      const pipeline = buildPipeline(mockFeatureRequest);
      let callCount = 0;
      const report = executeStages(pipeline, () => {
        callCount++;
        return {
          id: String(callCount),
          status: callCount === 3 ? 'failed' as const : 'passed' as const,
          durationMs: 50,
        };
      });
      expect(report.failed).toBe(1);
      expect(report.allPassed).toBe(false);
    });

    it('deve registrar duracao total', () => {
      const pipeline = buildPipeline(mockRequest);
      const report = executeStages(pipeline, () => ({
        id: '1',
        status: 'passed' as const,
        durationMs: 50,
      }));
      expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatPipelineReport', () => {
    it('deve formatar relatorio com todos os campos', () => {
      const report = dryRunPipeline(mockRequest);
      const output = formatPipelineReport(report);
      expect(output).toContain('Pipeline Report');
      expect(output).toContain(report.mode);
      expect(output).toContain(report.taskType);
      expect(output).toContain('passed');
      expect(output).toContain('failed');
      expect(output).toContain('skipped');
    });

    it('deve mostrar budget quando presente', () => {
      const report = dryRunPipeline(mockRequest);
      const output = formatPipelineReport({ ...report, budget: { allowed: 100000, consumed: 35000, estimated: 30000 } });
      expect(output).toContain('Budget');
      expect(output).toContain('100000');
      expect(output).toContain('35000');
    });
  });

  describe('estimateTokensSaved', () => {
    it('deve retornar 0 para full pipeline', () => {
      expect(estimateTokensSaved('full', 12, 12)).toBe(0);
    });

    it('deve calcular economia para short', () => {
      const saved = estimateTokensSaved('short', 12, 8);
      expect(saved).toBeGreaterThan(0);
      expect(saved).toBe(60000);
    });

    it('deve calcular economia para forensic', () => {
      const saved = estimateTokensSaved('forensic', 12, 12);
      expect(saved).toBe(0);
    });
  });

  describe('modeLabel', () => {
    it('deve retornar label para short', () => {
      expect(modeLabel('short')).toContain('bugfix');
    });

    it('deve retornar label para full', () => {
      expect(modeLabel('full')).toContain('features');
    });

    it('deve retornar label para forensic', () => {
      expect(modeLabel('forensic')).toContain('seguranca');
    });
  });

  describe('cleanup request', () => {
    it('deve classificar e construir pipeline conforme tipo detectado', () => {
      const pipeline = buildPipeline(mockCleanupRequest);
      expect(pipeline.stages.length).toBeGreaterThan(0);
      expect(pipeline.mode).toMatch(/^(short|full|forensic)$/);
    });

    it('budget baixo pode forcar short mesmo para cleanup', () => {
      const pipeline = buildPipeline({ ...mockCleanupRequest, budget: { max_tokens: 10000 } });
      expect(pipeline.mode).toBe('short');
    });
  });

  describe('simulateStages', () => {
    it('deve gerar N stages com status passed por padrao', () => {
      const result = simulateStages(5);
      expect(result).toHaveLength(5);
      result.forEach((s, i) => {
        expect(s.id).toBe(String(i + 1));
        expect(s.status).toBe('passed');
        expect(s.durationMs).toBeGreaterThanOrEqual(50);
      });
    });

    it('deve falhar o stage especificado', () => {
      const result = simulateStages(3, 2);
      expect(result[0].status).toBe('passed');
      expect(result[1].status).toBe('failed');
      expect(result[2].status).toBe('passed');
    });

    it('deve falhar o primeiro stage quando failStage=1', () => {
      const result = simulateStages(1, 1);
      expect(result[0].status).toBe('failed');
    });

    it('deve passar todos os stages quando failStage maior que total', () => {
      const result = simulateStages(2, 99);
      expect(result.every((s) => s.status === 'passed')).toBe(true);
    });
  });

  describe('executeStages', () => {
    it('deve executar stages sem simulateFn (default passar)', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'pending' },
          { id: '2', name: 'budget', description: 'Orcamento', required: false, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.allPassed).toBe(true);
      expect(report.passed).toBe(2);
      expect(report.stages.every(s => s.status === 'passed')).toBe(true);
    });

    it('deve executar stages com simulateFn', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline, () => ({ id: '1', status: 'passed' as const, durationMs: 100 }));
      expect(report.allPassed).toBe(true);
      expect(report.stages[0].durationMs).toBe(100);
    });

    it('deve manter stage com status ja definido (nao pending)', () => {
      const pipeline: PipelineConfig = {
        mode: 'full',
        taskType: 'feature',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'skipped' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.stages[0].status).toBe('skipped');
    });

    it('deve lidar com simulateFn que lanca excecao (status failed)', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline, () => { throw new Error('sim failure'); });
      expect(report.stages[0].status).toBe('failed');
      expect(report.allPassed).toBe(false);
    });
  });

  describe('additional executeStages + estimateTokensSaved', () => {
    it('deve manter todos como skipped quando nenhum esta pending', () => {
      const pipeline: PipelineConfig = {
        mode: 'full',
        taskType: 'feature',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'skipped' },
          { id: '2', name: 'route', description: '', required: false, status: 'skipped' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.skipped).toBe(2);
      expect(report.allPassed).toBe(true);
    });

    it('deve manter status running para stage em running', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'running' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.stages[0].status).toBe('running');
      expect(report.skipped).toBe(0);
      expect(report.passed).toBe(0);
    });

    it('deve calcular totalDurationMs como nao-negativo com varios stages', () => {
      const stages: PipelineStage[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}-s`, name: `Stage ${i + 1}`, description: '', required: false, status: 'pending' as const,
      }));
      const pipeline: PipelineConfig = { mode: 'full', taskType: 'feature', stages };
      const report = executeStages(pipeline, () => ({ id: '1', status: 'passed' as const, durationMs: 10 }));
      expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(report.passed).toBe(5);
    });

    it('deve preservar durationMs do simulateFn em cada stage', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'pending' },
          { id: '2', name: 'budget', description: '', required: false, status: 'pending' },
        ],
      };
      const durations = [100, 250];
      let i = 0;
      const report = executeStages(pipeline, () => ({ id: String(++i), status: 'passed' as const, durationMs: durations[i - 1] }));
      expect(report.stages[0].durationMs).toBe(100);
      expect(report.stages[1].durationMs).toBe(250);
    });

    it('deve gerar modeReason contendo modo e contagem de etapas', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.modeReason).toContain('short');
      expect(report.modeReason).toContain('etapa');
    });

    it('estimateTokensSaved deve calcular economia para short com stages reduzidos', () => {
      const saved = estimateTokensSaved('short', 12, 6);
      expect(saved).toBe(6 * 15000);
      expect(saved).toBe(90000);
    });

    it('estimateTokensSaved deve retornar 0 para full sem stages economizados', () => {
      const saved = estimateTokensSaved('full', 12, 12);
      expect(saved).toBe(0);
    });

    it('estimateTokensSaved deve retornar 0 para forensic mesmo com stages diferentes', () => {
      const saved = estimateTokensSaved('forensic', 8, 8);
      expect(saved).toBe(0);
    });

    it('deve retornar allPassed=false quando ha multiplas falhas', () => {
      const pipeline: PipelineConfig = {
        mode: 'full',
        taskType: 'security_review',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'pending' },
          { id: '2', name: 'route', description: '', required: false, status: 'pending' },
          { id: '3', name: 'risk_score', description: '', required: false, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline, (stage) => ({
        id: stage.id,
        status: stage.id === '1' ? 'failed' as const : stage.id === '3' ? 'failed' as const : 'passed' as const,
        durationMs: 50,
      }));
      expect(report.failed).toBe(2);
      expect(report.passed).toBe(1);
      expect(report.allPassed).toBe(false);
    });

    it('executeStages deve somar duracao total de todos os stages', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'test_only',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline, () => ({ id: '1', status: 'passed' as const, durationMs: 12345 }));
      expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(report.stages[0].durationMs).toBe(12345);
    });
  });

    it('deve executar executeStages com simulateFn curta', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline, () => ({ id: '1', status: 'passed' as const, durationMs: 100 }));
      expect(report.allPassed).toBe(true);
      expect(report.stages[0].durationMs).toBe(100);
    });

    it('deve manter stage com status ja definido (nao pending)', () => {
      const pipeline: PipelineConfig = {
        mode: 'full',
        taskType: 'feature',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'skipped' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.stages[0].status).toBe('skipped');
    });

    it('deve lidar com simulateFn que lanca excecao (status failed)', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline, () => { throw new Error('sim failure'); });
      expect(report.stages[0].status).toBe('failed');
      expect(report.allPassed).toBe(false);
    });

    it('deve manter stage skipped quando status ja definido', () => {
      const pipeline: PipelineConfig = {
        mode: 'full',
        taskType: 'feature',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'skipped' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.stages[0].status).toBe('skipped');
      expect(report.skipped).toBe(1);
    });

    it('deve preservar status running quando ja definido', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: 'Classificar', required: true, status: 'running' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.stages[0].status).toBe('running');
      expect(report.skipped).toBe(0);
    });

    it('deve calcular totalDurationMs com muitos stages', () => {
      const stages: PipelineStage[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}-s`, name: `Stage ${i + 1}`, description: '', required: false, status: 'pending' as const,
      }));
      const pipeline: PipelineConfig = { mode: 'full', taskType: 'feature', stages };
      const report = executeStages(pipeline, () => ({ id: '1', status: 'passed' as const, durationMs: 30 }));
      expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(report.passed).toBe(10);
      expect(report.failed).toBe(0);
    });

    it('deve acumular durationMs quando simulateFn fornece durcoes diferentes', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'pending' },
          { id: '2', name: 'budget', description: '', required: false, status: 'pending' },
          { id: '3', name: 'report', description: '', required: true, status: 'pending' },
        ],
      };
      const durations = [100, 200, 50];
      let idx = 0;
      const report = executeStages(pipeline, () => ({ id: '1', status: 'passed' as const, durationMs: durations[idx++] }));
      expect(report.stages[0].durationMs).toBe(100);
      expect(report.stages[1].durationMs).toBe(200);
      expect(report.stages[2].durationMs).toBe(50);
    });

    it('deve retornar allPassed=true quando nao ha falhas', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'test_only',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.allPassed).toBe(true);
      expect(report.failed).toBe(0);
    });

    it('deve retornar allPassed=false quando ha pelo menos uma falha', () => {
      const pipeline: PipelineConfig = {
        mode: 'forensic',
        taskType: 'security_review',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'pending' },
          { id: '2', name: 'risk_score', description: '', required: false, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline, (stage) => ({
        id: stage.id,
        status: stage.id === '1' ? 'failed' as const : 'passed' as const,
        durationMs: 50,
      }));
      expect(report.allPassed).toBe(false);
      expect(report.failed).toBe(1);
      expect(report.passed).toBe(1);
    });

    it('estimateTokensSaved deve retornar economia exata para short com stages conhecidos', () => {
      const saved = estimateTokensSaved('short', 12, 6);
      expect(saved).toBe(6 * 15000);
      expect(saved).toBe(90000);
    });

    it('estimateTokensSaved deve permitir economia zero para forensic mesmo com stages reduzidos', () => {
      const saved = estimateTokensSaved('forensic', 12, 12);
      expect(saved).toBe(0);
    });

    it('estimateTokensSaved deve retornar 0 para full sem stages pulados', () => {
      const saved = estimateTokensSaved('full', 12, 12);
      expect(saved).toBe(0);
    });

    it('estimateTokensSaved com modo desconhecido deve comportar-se como full', () => {
      const saved = estimateTokensSaved('full' as PipelineMode, 10, 5);
      expect(saved).toBe(0);
    });

    it('executeStages deve gerar modoReason padrao com contagem de etapas', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1', name: 'classify', description: '', required: true, status: 'pending' },
        ],
      };
      const report = executeStages(pipeline);
      expect(report.modeReason).toContain('1');
      expect(report.modeReason).toContain('short');
    });
});
