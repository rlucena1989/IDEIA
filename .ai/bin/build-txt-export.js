const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = process.cwd();
const targetDir = path.resolve(process.cwd(), '../ai-devkit-txt-export');

const ORPHAN_PATTERN = /^(fix|patch|dummy|run_|test_|tamper|copy_|audit-|apply-)[-_a-zA-Z0-9]*\.(js|ts)$/i;

if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

function copyToTxtExport(currentPath, currentTarget) {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const item of items) {
        if (['node_modules', '.git', 'dist'].includes(item.name)) continue;

        const srcPath = path.join(currentPath, item.name);
        const destPath = path.join(currentTarget, item.name);

        if (item.isDirectory()) {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }
            copyToTxtExport(srcPath, destPath);
        } else {
            if (ORPHAN_PATTERN.test(item.name) && !srcPath.includes('06-PATCH-HISTORY')) {
                continue;
            }
            fs.copyFileSync(srcPath, destPath + '.txt');
        }
    }
}

console.log("Iniciando cópia limpa e regulada para o TXT Export...");
copyToTxtExport(sourceDir, targetDir);
console.log("Gerando o arquivo ZIP...");
execSync(`rm ${path.resolve(process.cwd(), '../ai-devkit-FINAL-txt-export.zip')} || true`);
execSync(`zip -rq ai-devkit-FINAL-txt-export.zip ai-devkit-txt-export/`, { cwd: path.resolve(process.cwd(), '..') });
console.log("Exportação TXT Concluída com sucesso.");
