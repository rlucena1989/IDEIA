#!/usr/bin/env node
'use strict'
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Handlebars = require('handlebars');
const yaml = require('js-yaml');
const ROOT = process.cwd();

/**
 * Pilar 4: Máquina de Prompts Dinâmica (Prompt-as-Code)
 * Compila templates Handlebars injetando o contexto ao vivo do repositório
 */
function compilePrompt(templateName) {
    const templatePath = path.join(ROOT, '.ai/prompts', `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
        console.error(`Template não encontrado: ${templatePath}`);
        process.exit(1);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);

    // 1. Pegar o git diff (se houver)
    let gitDiff = '';
    try {
        try { gitDiff = execSync('git diff HEAD', { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }); } catch(e) {}
        if (!gitDiff || gitDiff.trim() === '') {
            gitDiff = execSync('git diff', { cwd: ROOT, encoding: 'utf8' });
        }
    } catch(e) {
        gitDiff = 'Nenhum commit/diff encontrado. Pode ser um repo recém criado.';
    }

    // 2. Extrair dados do Project Manifest
    let stack = {};
    const manifestPath = path.join(ROOT, '.ai/project-manifest.yaml');
    if (fs.existsSync(manifestPath)) {
        try {
            const manifest = yaml.load(fs.readFileSync(manifestPath, 'utf8')) || {};
            if (manifest.framework) stack.framework = manifest.framework;
            if (manifest.database) stack.database = manifest.database;
            if (manifest.orm) stack.orm = manifest.orm;
        } catch (e) {
            const content = fs.readFileSync(manifestPath, 'utf8');
            const fMatch = content.match(/framework:\s*"?([^"\n]+)"?/);
            const dMatch = content.match(/database:\s*"?([^"\n]+)"?/);
            const oMatch = content.match(/orm:\s*"?([^"\n]+)"?/);
            if (fMatch) stack.framework = fMatch[1];
            if (dMatch) stack.database = dMatch[1];
            if (oMatch) stack.orm = oMatch[1];
        }
    }

    // 3. Extrair Catálogo de Erros
    let knownErrors = '';
    const errPath = path.join(ROOT, '.ai/errors/error-catalog.md');
    if (fs.existsSync(errPath)) {
        knownErrors = fs.readFileSync(errPath, 'utf8');
    }

    // Compila e devolve o prompt hiper-contextualizado
    const result = template({
        gitDiff: gitDiff || "Nenhuma alteração pendente no stage.",
        stack,
        hasErrors: knownErrors.length > 50,
        knownErrors: knownErrors.substring(0, 1000) // Truncado para caber no limite
    });

    console.log(result);
}

const templateArg = process.argv[2] || 'review-template';
compilePrompt(templateArg);
