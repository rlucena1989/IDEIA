import { Command } from "commander";
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.feature');
import fs from "node:fs";
import path from "node:path";

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export function generateArtifact(filePath: string, content: string) {
  fs.writeFileSync(filePath, content.trim() + "\n", "utf8");
  logger.info('✅ Gerado: ${filePath}');
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function featureAnalyzeAction(request: string, options: { ui?: boolean }): void {
  logger.info('\n🧠 Iniciando Feature Intelligence Dinâmica...');
  logger.info('📝 Processando: "${request}"\n');

  const featureSlug = slugify(request.split(" ").slice(0, 3).join("-") || "nova-feature");
  const featureDir = path.join(process.cwd(), ".ai", "features", featureSlug);
  ensureDir(featureDir);

  let dominiosAtrelados = "Nenhum mapeamento de domínio existente encontrado no src/. A feature nascerá isolada.";
  const modulesDir = path.join(process.cwd(), "src/modules");
  if (fs.existsSync(modulesDir)) {
    const folders = fs.readdirSync(modulesDir).filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory());
    if (folders.length > 0) {
      dominiosAtrelados = "Integrações possíveis com os seguintes domínios: " + folders.join(", ");
    }
  }

  generateArtifact(
    path.join(featureDir, "feature-brief.md"),
    `# Especificação da Feature: ${request}\n\n## Mapeamento de Domínio (AST)\n${dominiosAtrelados}\n\n## O que a IA deve preencher:\n1. Defina as Entidades envolvidas.\n2. Defina as Interfaces Externas.\n`
  );

  generateArtifact(
    path.join(featureDir, "acceptance-criteria.md"),
    `# Critérios de Aceite para "${request}"\n\n(A IA deve gerar os cenários baseando-se no framework principal do sistema e no \`Contract.ts\`).\n`
  );

  generateArtifact(
    path.join(featureDir, "test-matrix.md"),
    `# Matriz TDD\nA IA deve primeiramente gerar os testes abaixo e atestar a falha antes de codar a Controller:\n\n- [ ] Teste de Exceção de AppError\n- [ ] Teste de Parse do Zod\n- [ ] Teste de Sucesso e Status Code`
  );

  const requiresUI = options.ui || /tela|interface|página|dashboard|view|frontend/i.test(request);
  if (requiresUI) {
    logger.info('✨ Intenção de UI detectada.');
    generateArtifact(path.join(featureDir, "ui-checklist.md"), `# UI/UX Checklist (A ser resolvido pela IA)\n- [ ] Validar acessibilidade\n- [ ] Aplicar design system`);
  }

  logger.info('\n🚀 Análise real concluída.');
}

export function featureCommand(): Command {
  const cmd = new Command("feature")
    .description("Feature Intelligence Engine Real - Análise com base no estado do código");

  cmd
    .command("analyze <request>")
    .description("Análise real ligada ao Source Code")
    .option("--ui", "Gera artefatos de UX/UI")
    .action((request, options) => featureAnalyzeAction(request, options));

  return cmd;
}
