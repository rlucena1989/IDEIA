# Comparacao de Kits de Desenvolvimento de IA

## Objetivo

Descrever ferramentas e abordagens similares para desenvolvimento de software assistido por IA, e identificar o que podemos extrair de cada uma para fortalecer o ai_devkit.

## Kits e frameworks comparaveis

- **GitHub Copilot / Copilot Chat / Microsoft Gemini / Amazon CodeWhisperer**: fortes em codificacao assistida no editor, autocompletacao contextual e refatoracao de trechos de codigo.
  - Vantagem: entendem o codigo ao redor e produzem patches ou sugestoes com pouco prompt.
  - O que extrair para o ai_devkit: templates de prompt para edicao incremental, padrao de patch minimo, verificacao de estilo de codigo local e suporte a refatoracoes orientadas por contexto.
- **Function-first workflows (OpenAI, etc.)**: fortes em gerar funcoes claramente definidas, com signature, validacao de input/output e documentação de contrato.
  - Vantagem: ajudam a criar blocos de codigo que ja nascem com contrato e testes.
  - O que extrair para o ai_devkit: prompts para gerar funcoes com DTOs, schematas Zod/OpenAPI, casos de teste a partir da assinatura e validação automatizada de entradas e saídas.
- **LangChain / LlamaIndex**: excelentes em agentes, orquestracao de tarefas, consultoria de documentos e recuperacao de contexto.
  - Vantagem: permitem criar fluxos multi-etapa, acesso a dados externos e memoria de conversa ligada a artefatos do projeto.
  - O que extrair para o ai_devkit: arquitetura de pipeline, checkpoints, logs de decisao, orquestracao de passos e uso de memoria para conectar discovery, implementacao e release.
- **Playbooks de prompt engineering**: fortes em padronizacao de prompts, regras de escopo e controle de qualidade do output.
  - Vantagem: reduzem variabilidade e ajudam a obter respostas consistentes.
  - O que extrair para o ai_devkit: checklists de prompt, templates de objetivo/regra/saida, criterios de aceitacao e guardrails de respostas aceitaveis.

## Vantagens especificas de cada classe de ferramenta

- **Copilot / Gemini / CodeWhisperer**: velocidade na codificacao, adaptacao ao contexto do editor, edicao incremental e sugestoes de refatoracao em tempo real.
- **Function-first workflows**: estabilidade de contrato, geracao de testes automatizados, previsibilidade de comportamento e validacao de interfaces.
- **LangChain / LlamaIndex**: capacidade de orquestrar tarefas, consultar conhecimento distribuido, integrar documentos e manter memorias de projeto de longo prazo.
- **Playbooks de prompt engineering**: governanca sobre a estrutura do prompt, regras claras de escopo e padrao de qualidade do resultado.

## O que o ai_devkit deve absorver

- Do universo de codificacao assistida: prompts de patch minimo, regras de estilo, focos em edicao incremental e integracao com o editor.
- Do function-first: contratos como primeiro passo, validacao de entradas/saidas, geracao de testes por assinatura e especificacao clara de funcoes.
- De agentes/orquestracao: pipelines de tarefas, checkpoints, logs de decisões e memoria de contexto entre sessoes.
- De playbooks de prompt engineering: templates padronizados, criterios de aceitacao, validacao de qualidade e guardrails para reduzir ruido.

## Onde este kit se diferencia

- Mantem contexto de projeto em .ai/context/ e .ai/memory/ para continuidade de sessao.
- Padroniza prompts de discovery, implementacao, code review, seguranca, qualidade e release.
- Fornece checklists de prontidao e release para garantir uma entrega robusta.
- Usa artefatos de projeto e arquitetura (ADRs, manifestos, contratos) para reduzir riscos e alinhar a equipe.
- Integra analise de custos de tokens e produtividade com fluxo de trabalho documentado.

## Quando usar cada abordagem

- Use **Copilot / Gemini / CodeWhisperer** para codificacao assistida rapida, edicao local de trechos de codigo e refatoracao contextual.
- Use **LangChain / LlamaIndex** quando precisar de agentes ou orquestracao de passos entre conhecimento, documentos e implementacao.
- Use **Function-first workflows** para gerar funcoes, especificacoes contratuais e validacao de contratos de dados.
- Use **Playbooks de prompt engineering** para estabilizar a estrutura de prompts e garantir padrao entre sessoes.

## Recomendacao

- Combine este kit com ferramentas de assistencia de codigo como Copilot para desenvolvimento mais rapido.
- Use o kit como camada de governanca e entrega em cima de fluxos de IA existentes, nao como substituto de todas as tecnologias.
