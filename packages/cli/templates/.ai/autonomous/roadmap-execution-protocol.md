# Protocolo de Execucao de Planos Faseados (Roadmaps)

Use este protocolo sempre que receber uma instrucao do tipo:
"Implemente as fases do arquivo X seguindo o plano, aplicando o codigo apenas no arquivo Y".

## 1. Localizar e ler o plano

- Encontre o arquivo de roadmap/plano indicado (ex.: `.ai/roadmap/*.md`).
- Leia o documento por completo antes de comecar (todas as fases, nao so a primeira).
- Identifique a ordem recomendada de execucao, se houver.

## 2. Identificar a restricao de escopo

- Verifique se ha um arquivo-alvo unico ou uma lista de arquivos permitidos.
- Trate essa restricao como um checkpoint obrigatorio (ver `.ai/agents/permissions.yaml`).
- Nunca crie ou edite arquivos fora do escopo declarado, mesmo que pareca conveniente.

## 3. Planejar as fases

- Registre cada fase do roadmap como um item de cada list, na ordem definida.
- Mantenha no maximo uma fase 'em andamento' por vez.

## 4. Executar fase a fase

- Implemente uma fase por vez, em blocos pequenos e coerentes.
- Apos cada fase, rode uma verificacao rapida e barata (ex.: `node --check`, lint do trecho).
- So avance para a proxima fase depois que a verificacao da fase atual passar.
- Nao acumule multiplas fases sem validar — isso dificulta o diagnostico de erros.

## 5. Fechar com validacao global

- Ao final de todas as fases, rode a suite completa (`typecheck`, `test`, `lint`, scripts de verificacao do projeto).
- Atualize documentacao dependente (README, CONTRIBUTING-AI.md, package.json scripts) se novos comandos foram criados.
- Rode o comando principal do projeto (ex.: `node setup.js`) quando o proprio bootstrap for o alvo do plano.

## 6. Registrar o resultado

- Atualize `.ai/memory/decisions.md` ou `.ai/memory/session-summary-template.md` com um resumo do que foi implementado.
- Marque todas as fases da cada list como concluidas somente apos a validacao global passar.

## Regras gerais

- Nunca use rede, credenciais ou comandos destrutivos para cumprir um plano.
- Prefira idempotencia: reexecutar o processo nao deve duplicar ou corromper conteudo.
- Se o plano for ambiguo quanto a escopo ou formato de saida, pergunte antes de implementar.
