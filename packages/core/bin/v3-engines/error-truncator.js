function truncateError(rawErrorLog) {
    const lines = rawErrorLog.split('\n');
    const relevantLines = [];
    
    for (const line of lines) {
        // Filtrar apenas o que importa pro LLM: erros TS, falhas Jest, e stacktraces locais (src/)
        if (
            line.includes('error TS') || 
            line.includes('FAIL') || 
            line.includes('Expected:') || 
            line.includes('Received:') ||
            (line.includes('at ') && line.includes('src/'))
        ) {
            relevantLines.push(line.trim());
        }
    }
    
    if (relevantLines.length === 0) {
        return rawErrorLog.substring(0, 1500) + '\n... [Truncado]'; // Fallback
    }

    // Limitar a 30 linhas para garantir que o LLM não seja sobrecarregado
    const truncated = relevantLines.slice(0, 30);
    if (relevantLines.length > 30) {
        truncated.push(`... [Mais ${relevantLines.length - 30} linhas de stack omitidas pelo Cognitive Filter]`);
    }
    
    return truncated.join('\n');
}

module.exports = { truncateError };
