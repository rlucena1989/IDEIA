const https = require('https');

function researchDocs(query) {
    return new Promise((resolve, reject) => {
        // Se houver uma chave de API para pesquisas reais na web:
        if (process.env.TAVILY_API_KEY) {
            console.log(`[Oracle Research] Buscando na API do Tavily: ${query}`);
            
            const data = JSON.stringify({ query: query, search_depth: "basic" });
            const req = https.request({
                hostname: 'api.tavily.com',
                port: 443,
                path: '/search',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    'api-key': process.env.TAVILY_API_KEY
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        if(json.results && json.results.length > 0) {
                             const snippet = json.results.map(r => `Fonte: ${r.url}\nConteúdo: ${r.content}`).join('\n\n');
                             resolve(`[ORACLE RESEARCH RESULTS]\n${snippet}`);
                        } else {
                             resolve("[ORACLE RESEARCH] Nenhuma documentação foi encontrada. Cuidado com alucinações baseadas em libs obsoletas.");
                        }
                    } catch(e) {
                        reject(new Error("Falha no parsing da API."));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(data);
            req.end();
            return;
        }

        // Sem API de web-search, usamos um fallback HONESTO (e não um fake text)
        console.warn("[Oracle Research] Nenhuma chave TAVILY_API_KEY encontrada no ambiente.");
        console.log(`[Oracle Research] Fallback Ativado: Tentando vasculhar metadados NPM para "${query}"...`);
        
        // Exemplo: Buscar a documentação crua da lib no NPM Registry
        const libMatch = query.split(' ')[0]; // Heurística simples para pegar o pacote
        https.get(`https://registry.npmjs.org/${libMatch}`, (res) => {
            if(res.statusCode !== 200) {
               return resolve(`[ORACLE RESEARCH] Web Search desativado e falha ao buscar "${libMatch}" no NPM (Status: ${res.statusCode}). Recomenda-se leitura manual da documentação antes de codar.`);
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    const latest = json['dist-tags'].latest;
                    resolve(`[ORACLE RESEARCH - NPM FALLBACK]\nPacote: ${libMatch} (v${latest})\nDescription: ${json.description}\nNota: Pesquisa profunda não habilitada. Baseie-se apenas em sintaxe compatível com v${latest}.`);
                } catch(e) {
                    resolve("[ORACLE RESEARCH] Falha ao extrair docs do NPM.");
                }
            });
        }).on('error', (e) => reject(e));
    });
}

module.exports = { researchDocs };
