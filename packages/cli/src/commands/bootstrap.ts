import { Command } from 'commander';
import { bootstrapProject, generateModuleDocs, generatePromptPack } from '../runtime/bootstrap-engine';
import * as fs from 'fs';
import * as _path from 'path';

/**
 * Cria bootstrap command.
 * @returns O resultado da operação.
 */
function createBootstrapCommand(): Command {
  const command = new Command('bootstrap')
    .description('Bootstrap e Documentacao Viva — Fase 14');

  command
    .command('init <projectName>')
    .description('Inicializa um projeto com templates padrao')
    .option('--features <items>', 'Features separadas por virgula (express, api, docker, env)', '')
    .option('--output <dir>', 'Diretorio de saida', '.')
    .option('--dry-run', 'Mostra o que seria criado sem criar')
    .action((name, opts) => {
      const features = opts.features ? opts.features.split(',').map((f: string) => f.trim()).filter(Boolean) : [];
      const config = { projectName: name, stack: 'node' as const, features, outputDir: opts.output };
      if (opts.dryRun) {
        console.log(`\nDry-run: ${name}`);
        console.log(`  Features: ${features.join(', ') || '(nenhuma)'}`);
        console.log(`  Output: ${opts.output}`);
        return;
      }
      const result = bootstrapProject(config);
      console.log(`\nBootstrap de "${name}":`);
      console.log(`  ${result.summary}`);
      for (const c of result.created) console.log(`  Criado: ${c}`);
      for (const s of result.skipped) console.log(`  Pulado: ${s}`);
      for (const e of result.errors) console.error(`  Erro: ${e}`);
    });

  command
    .command('docs')
    .description('Gera documentacao viva dos modulos do runtime')
    .option('--save <file>', 'Salvar em arquivo')
    .action((opts) => {
      const modules = [
        { name: 'Pattern Registry', file: 'runtime/pattern-registry.ts', description: 'Registro central de padroes arquiteturais, design, UI, sistema, negocios, seguranca e performance.', exports: ['PatternRegistry', 'PatternDefinition', 'DEFAULT_PATTERN_REGISTRY_CONFIG'] },
        { name: 'Pattern Observer', file: 'runtime/pattern-observer.ts', description: 'Observa codigo fonte e detecta padroes em uso, com inferencia de confianca.', exports: ['PatternObserver', 'ObservationResult', 'inferPattern'] },
        { name: 'Consistency Engine', file: 'runtime/consistency-engine.ts', description: 'Engine que classifica intencao da mudanca, avalia risco e decide preserve/adapt/replace/create.', exports: ['ConsistencyEngine', 'EngineReport', 'classifyIntent'] },
        { name: 'Equivalence Detector', file: 'runtime/equivalence-detector.ts', description: 'Detecta equivalencia estrutural e semantica entre dois trechos de codigo.', exports: ['detectEquivalence', 'EquivalenceResult'] },
        { name: 'Solution Upgrader', file: 'runtime/solution-upgrader.ts', description: 'Detecta oportunidades de upgrade tecnologico no codigo existente.', exports: ['SolutionUpgrader', 'UpgradePlan', 'UpgradeSuggestion'] },
        { name: 'Intent Expander', file: 'runtime/intent-expander.ts', description: 'Expande intencoes de mudanca e avalia riscos com fatores de mitigacao.', exports: ['expandIntent', 'assessRisk'] },
        { name: 'UX Consistency Rules', file: 'runtime/ui-consistency-rules.ts', description: '6 regras de consistencia UI: spacing, color, typography, inline-styles, a11y.', exports: ['UIConsistencyValidator', 'DEFAULT_CONSISTENCY_RULES'] },
        { name: 'Design Tokens', file: 'runtime/design-tokens.ts', description: '35+ tokens de design e 7 layouts CSS grid com formatadores CSS/JSON/SCSS.', exports: ['BUILT_IN_TOKENS', 'BUILT_IN_LAYOUTS', 'formatTokensCSS'] },
        { name: 'Request Normalizer', file: 'runtime/request-normalizer.ts', description: 'Normaliza requisicoes de diferentes fontes (texto, voz, estruturado) e classifica intencao.', exports: ['normalizeRequest', 'formatRequestOverview', 'NormalizedRequest'] },
        { name: 'Ambiguity Detector', file: 'runtime/ambiguity-detector.ts', description: 'Detecta ambiguidade em requisicoes e sugere enriquecimento de contexto.', exports: ['detectAmbiguity', 'AmbiguityReport'] },
        { name: 'Stack Detector', file: 'runtime/stack-detector.ts', description: 'Detecta stack tecnologica do projeto (linguagem, framework, DB, CI, UI, testing).', exports: ['detectStack', 'StackInfo'] },
        { name: 'Layout Analyzer', file: 'runtime/layout-analyzer.ts', description: 'Analisa layout de componentes frontend (regioes, tipo de layout, responsividade).', exports: ['analyzeLayout', 'LayoutReport'] },
        { name: 'UX Analyzer', file: 'runtime/ux-analyzer.ts', description: '11 regras de experiencia do usuario com scoring automatico.', exports: ['analyzeUX', 'UXReport'] },
        { name: 'Memory Analyzer', file: 'runtime/memory-analyzer.ts', description: '8 regras de analise de memoria (leaks, closures, heap, event loop).', exports: ['analyzeMemory', 'MemoryAnalysisReport'] },
        { name: 'Concurrency Analyzer', file: 'runtime/concurrency-analyzer.ts', description: '7 regras de concorrencia (blocking I/O, callback hell, promises).', exports: ['analyzeConcurrency', 'ConcurrencyReport'] },
        { name: 'Platform Analyzer', file: 'runtime/platform-analyzer.ts', description: 'Informacoes da plataforma e 4 regras de validacao.', exports: ['getPlatformInfo', 'validatePlatform'] },
      ];
      const docs = generateModuleDocs(modules);
      if (opts.save) {
        fs.mkdirSync(opts.save.substring(0, opts.save.lastIndexOf('\\')), { recursive: true });
        fs.writeFileSync(opts.save, docs, 'utf-8');
        console.log(`Documentacao salva em: ${opts.save}`);
      } else {
        console.log(docs);
      }
    });

  command
    .command('prompt-pack')
    .description('Gera pacote de prompts para uso com modelos de IA')
    .option('--save <file>', 'Salvar em arquivo')
    .action((opts) => {
      const modules = [
        { name: 'Pattern Analysis', description: 'Analise os padroes arquiteturais e de design presentes no codigo fonte.', cli: 'ai-devkit patterns list' },
        { name: 'UI Consistency', description: 'Valide a consistencia visual e de acessibilidade dos componentes.', cli: 'ai-devkit patterns validate-ui <file>' },
        { name: 'Content Equivalence', description: 'Compare dois trechos de codigo para verificar equivalencia estrutural.', cli: 'ai-devkit consistency equivalent <fileA> <fileB>' },
        { name: 'Upgrade Planning', description: 'Identifique oportunidades de modernizacao e upgrade tecnologico.', cli: 'ai-devkit consistency upgrade <file>' },
        { name: 'Intent Classification', description: 'Classifique a intencao e o risco de uma mudanca proposta.', cli: 'ai-devkit consistency classify <file>' },
        { name: 'Request Normalization', description: 'Normalize e Classifique requisicoes de entrada.', cli: 'ai-devkit multimodal normalize "<text>"' },
        { name: 'Stack Detection', description: 'Detecte a stack tecnologica do projeto automaticamente.', cli: 'ai-devkit multimodal detect-stack' },
        { name: 'UX Analysis', description: 'Analise a experiencia do usuario em componentes e paginas.', cli: 'ai-devkit multimodal analyze-ux <file>' },
        { name: 'Memory Analysis', description: 'Analise uso de memoria, closures e possiveis leaks.', cli: 'ai-devkit low-level memory <file>' },
        { name: 'Concurrency Review', description: 'Revise problemas de concorrencia e bloqueio.', cli: 'ai-devkit low-level concurrency <file>' },
        { name: 'Platform Validation', description: 'Valide se o ambiente atende aos requisitos minimos.', cli: 'ai-devkit low-level platform' },
        { name: 'Template Generation', description: 'Gere templates de componentes e servicos.', cli: 'ai-devkit preview frontend <name> --stack react' },
      ];
      const pack = generatePromptPack(modules);
      if (opts.save) {
        fs.mkdirSync(opts.save.substring(0, opts.save.lastIndexOf('\\')), { recursive: true });
        fs.writeFileSync(opts.save, pack, 'utf-8');
        console.log(`Prompt pack salvo em: ${opts.save}`);
      } else {
        console.log(pack);
      }
    });

  return command;
}

export { createBootstrapCommand };