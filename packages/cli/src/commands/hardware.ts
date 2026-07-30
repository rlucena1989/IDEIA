import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { printHeader, printLine, printResult } from '../utils/output';
import { detectHardware, formatHardwareReport } from '../local-ai/hardware-detector';
import { success, CliCommandResult } from '../types/cli-result';
const logger = createLogger('hardware');

export function hardwareCommand(): Command {
  const cmd = new Command('hardware')
    .description('Detecta hardware e recomenda modelo de LLM');

  cmd
    .command('detect')
    .description('Detecta hardware disponivel (RAM, CPU, GPU)')
    .option('--json', 'Saida em formato JSON')
    .action((options: { json?: boolean }): CliCommandResult => {
      const specs = detectHardware();

      if (options.json) {
        printLine(JSON.stringify(specs, null, 2));
        return success('Hardware detection complete', specs);
      }

      printHeader('Hardware Detection');
      printLine(formatHardwareReport(specs));
      printResult('Detecção concluída', true);
      return success('Hardware detection complete', specs);
    });

  cmd
    .command('recommend')
    .description('Recomenda modelo de LLM baseado no hardware')
    .option('--json', 'Saida em formato JSON')
    .action((options: { json?: boolean }): CliCommandResult => {
      const specs = detectHardware();

      if (options.json) {
        printLine(JSON.stringify({
          recommendedModelSize: specs.recommendedModelSize,
          totalRamGB: specs.totalRamGB,
          gpuVRAM: specs.gpu?.vramGB || 0,
        }, null, 2));
        return success('Model recommendation generated', specs);
      }

      printHeader('Model Recommendation');
      printLine(`Based on your hardware (${specs.totalRamGB}GB RAM${specs.gpu ? `, ${specs.gpu.vramGB}GB VRAM` : ''}):`);
      printLine(`  Recommended model size: ${specs.recommendedModelSize}`);

      const modelMap: Record<string, string> = {
        '7B': 'qwen2.5-coder-7b, phi-4-mini, llama3.2-3b',
        '13B': 'codellama-13b, llama3.1-13b, deepseek-coder-6.7b',
        '70B': 'llama3.3-70b, deepseek-coder-v2-70b, qwen2.5-72b',
      };
      printLine(`  Suggested models: ${modelMap[specs.recommendedModelSize] || 'qwen2.5-coder-7b'}`);
      printResult('Recomendação gerada', true);
      return success('Model recommendation generated', specs);
    });

  return cmd;
}
