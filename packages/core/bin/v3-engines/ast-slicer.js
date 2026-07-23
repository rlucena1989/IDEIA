const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

function getSignatures(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(filePath);
    
    // Ocultar corpo de funções isoladas
    sourceFile.getFunctions().forEach(f => {
        if (f.hasBody()) f.setBodyText('/* code omitted to save tokens */');
    });
    
    // Ocultar corpo de métodos dentro de classes
    sourceFile.getClasses().forEach(c => {
        c.getMethods().forEach(m => {
            if (m.hasBody()) m.setBodyText('/* code omitted to save tokens */');
        });
        c.getConstructors().forEach(m => {
            if (m.hasBody()) m.setBodyText('/* code omitted */');
        });
    });

    return sourceFile.getText();
}

module.exports = { getSignatures };
