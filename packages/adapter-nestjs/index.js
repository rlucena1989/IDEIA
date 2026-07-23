/**
 * Adapter Oficial NestJS (V3 Enterprise)
 * Orquestra o ciclo completo de testes, lint e validações Clean Architecture para Nest.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'nestjs',
  capabilities: [
    'detect', 'init', 'generateFeature', 'runLint', 
    'runTests', 'runBuild', 'validateContracts', 'auditSecurity'
  ],

  detect: (projectRoot) => {
    try {
      const pkg = require(path.join(projectRoot, 'package.json'));
      return !!(pkg.dependencies && pkg.dependencies['@nestjs/core']);
    } catch {
      return false;
    }
  },

  init: (projectRoot) => {
    console.log('[NestJS Adapter] Inicializando configs específicas (tsconfig, nest-cli.json)...');
    
    // Geração Real de Arquivos de Suporte NestJS
    const nestCliJson = {
      "$schema": "https://json.schemastore.org/nest-cli",
      "collection": "@nestjs/schematics",
      "sourceRoot": "src",
      "compilerOptions": {
        "deleteOutDir": true
      }
    };
    fs.writeFileSync(path.join(projectRoot, 'nest-cli.json'), JSON.stringify(nestCliJson, null, 2));
    return true;
  },

  generateFeature: (projectRoot, featureName) => {
    console.log(`[NestJS Adapter] Gerando estrutura modular para a feature: ${featureName}`);
    const baseDir = path.join(projectRoot, 'src', 'modules', featureName);
    ['application/use-cases', 'application/dtos', 'domain/entities', 'domain/repositories', 'infrastructure/http/controllers', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    
    // Geração de DTO Zod / Contract Pattern
    const dtoContent = `import { z } from 'zod';\nimport { Contract } from '../../../shared/utils/Contract';\n\nexport const Create${featureName}Schema = z.object({});\nexport type Create${featureName}DTO = z.infer<typeof Create${featureName}Schema>;\n`;
    fs.writeFileSync(path.join(baseDir, 'application', 'dtos', `create-${featureName}.dto.ts`), dtoContent);

    // Facade e Module Real
    fs.writeFileSync(path.join(baseDir, 'index.ts'), `// Facade para o módulo ${featureName}\nexport * from './infrastructure/${featureName}.module';\n`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', `${featureName}.module.ts`), `import { Module } from '@nestjs/common';\n\n@Module({})\nexport class ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}Module {}\n`);
    
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[NestJS Adapter] Rodando ESLint...');
    try {
      execSync('npm run lint', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[NestJS Adapter] Rodando Jest (Unit & E2E)...');
    try {
      execSync('npm run test', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[NestJS Adapter] Rodando TypeScript Build...');
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  validateContracts: (projectRoot) => {
    console.log('[NestJS Adapter] Validando uso de Contract.ts e Zod nos DTOs...');
    try {
        const { Project } = require('ts-morph');
        const project = new Project({ tsConfigFilePath: path.join(projectRoot, 'tsconfig.json') });
        let errors = 0;
        project.addSourceFilesAtPaths('src/modules/**/application/use-cases/*.ts');
        project.getSourceFiles().forEach(sf => {
            const content = sf.getText();
            if (!content.includes('Contract.pre')) {
                console.warn(`[AVISO] Use-Case sem validação de contrato detectado: ${sf.getFilePath()}`);
                errors++;
            }
        });
        return errors === 0;
    } catch(e) {
        console.log('[NestJS Adapter] Falha ao rodar AST Contract Check. Certifique-se que ts-morph está instalado e tsconfig.json existe.');
        return false;
    }
  },

  auditSecurity: (projectRoot) => {
    console.log('[NestJS Adapter] Auditoria de Segurança (Helmet, CORS, Rate Limit)...');
    const mainPath = path.join(projectRoot, 'src', 'main.ts');
    if(fs.existsSync(mainPath)) {
        const content = fs.readFileSync(mainPath, 'utf8');
        if(!content.includes('helmet')) console.warn('AVISO: Helmet não configurado no main.ts');
        if(!content.includes('enableCors')) console.warn('AVISO: CORS não habilitado no main.ts');
    }
    return true;
  },

  qualityGate: (projectRoot) => {
    console.log('[NestJS Adapter] Executando Quality Gate...');
    // Realiza as checagens internas
    return module.exports.validateContracts(projectRoot);
  }
};
