const fs = require('fs');

function applyPatch(filePath, patchContent) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    let fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Suporte ao padrão Aider (SEARCH/REPLACE) que é muito mais robusto para LLMs que o Unified Diff puro
    const blockRegex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
    
    let match;
    let changesMade = 0;
    
    while ((match = blockRegex.exec(patchContent)) !== null) {
        const searchBlock = match[1];
        const replaceBlock = match[2];
        
        if (fileContent.includes(searchBlock)) {
            fileContent = fileContent.replace(searchBlock, replaceBlock);
            changesMade++;
        } else {
            throw new Error(`Bloco SEARCH não encontrado no arquivo. O código divergiu:\n${searchBlock}`);
        }
    }
    
    if (changesMade === 0) {
        throw new Error("Nenhum bloco de patch válido encontrado na requisição.");
    }

    fs.writeFileSync(filePath, fileContent, 'utf8');
    return `Sucesso: ${changesMade} modificação(ões) aplicada(s) em ${filePath}.`;
}

module.exports = { applyPatch };
