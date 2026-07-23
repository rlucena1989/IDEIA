# AI Devkit — Optimizer Policies

## 1. Política de economia
- minimizar contexto por padrão
- evitar múltiplos agentes quando um único agente basta
- evitar geração completa quando patch basta
- evitar duplicação de contexto entre módulos

## 2. Política de contexto
- incluir apenas arquivos relevantes
- justificar toda inclusão de arquivo
- excluir secrets, lockfiles sensíveis e artefatos pesados
- registrar o manifesto do contexto
- limitar o tamanho total do contexto por tarefa

## 3. Política de patch
- preferir alterações localizadas
- evitar reescrever arquivos inteiros sem necessidade
- preservar estilo e estrutura existentes
- manter diffs pequenos e legíveis
- validar o patch após aplicação

## 4. Política de memória do repositório
- reaproveitar padrões existentes antes de criar novos
- consultar casos similares antes de gerar solução
- armazenar decisões aprovadas

## 5. Política de qualidade
- avaliar a entrega após geração
- bloquear entregas com score abaixo do mínimo
- exigir aderência ao design system e às policies
- penalizar duplicação e complexidade desnecessária

## 6. Política de risco
- tarefas de alto risco exigem aprovação explícita
- tarefas críticas devem ser bloqueadas até análise manual
- mudanças em caminhos protegidos como sensíveis
- alterações amplas devem acionar revisão adicional
