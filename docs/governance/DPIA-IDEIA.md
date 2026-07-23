# Data Protection Impact Assessment — IDEIA

> **Documento:** DPIA-IDEIA.md
> **Versão:** 1.0
> **Data:** 2026-07-18
> **Status:** ✅ Publicado
> **Base:** Art. 38 LGPD, Art. 35 GDPR

## 1. Contexto

### 1.1 Sistema
IDEIA é uma IDE local com assistência de IA que processa código-fonte, arquivos de projeto e interações do usuário para fornecer suporte automatizado de desenvolvimento.

### 1.2 Controlador
IDEIA Core Team (contato: security@ideia.dev)

### 1.3 Finalidade do Tratamento
- Processamento de código-fonte para análise, geração e refatoração
- Manutenção de memória de sessão para continuidade contextual
- Registro de auditoria para rastreabilidade de decisões
- Telemetria opcional para melhoria do produto

## 2. Mapeamento de Dados

| Categoria | Dados | Fonte | Finalidade | Base Legal (LGPD) | Base Legal (GDPR) |
|-----------|-------|-------|------------|-------------------|--------------------|
| Código-fonte | Arquivos do projeto do usuário | Workspace local | Análise, geração, refatoração | Art. 7º, II (cumprimento obrigação) | Art. 6(1)(b) (contract) |
| Metadados | Nomes de arquivo, timestamps, tamanhos | Sistema de arquivos | Navegação, busca | Art. 7º, II | Art. 6(1)(b) |
| Logs de auditoria | Ações do usuário, decisões da IA, timestamps | Audit trail | Rastreabilidade, compliance | Art. 7º, II | Art. 6(1)(c) (legal obligation) |
| Configuração | Preferências, chaves de API, providers | Config files | Operação do sistema | Art. 7º, I (consentimento) | Art. 6(1)(a) (consent) |
| Telemetria (opcional) | Uso de features, métricas de performance | Eventos | Melhoria do produto | Art. 7º, I (consentimento) | Art. 6(1)(a) (consent) |

## 3. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:-------------:|:-------:|-----------|
| Vazamento de código-fonte via LLM | Média | Alto | Processamento local, LLM não envia código para cloud |
| Exposição de secrets em prompts | Baixa | Crítico | PromptSecurity.scan() — detecção e masking |
| Exposição de PII em saída LLM | Média | Alto | OutputValidation.validateOutput() — 6 regras de detecção |
| Acesso não autorizado a dados | Baixa | Alto | Policy engine, approval flow, sandbox |
| Quebra de integridade de audit trail | Baixa | Médio | SHA-256 hash chain + verifyChain() |
| Vazamento por dependência vulnerável | Média | Alto | npm audit, CodeQL em CI/CD, Dependabot |

## 4. Minimização de Dados

- Todo processamento é LOCAL (sem envio para cloud por padrão)
- Apenas arquivos do workspace abertos são processados
- Audit trail é limitado a 10MB por arquivo com rotação
- Telemetria é opcional e anonimizada
- Usuário pode excluir memória/audit trail a qualquer momento

## 5. Direitos do Titular

| Direito | LGPD | GDPR | Implementação |
|---------|------|------|---------------|
| Confirmação de tratamento | Art. 9 | Art. 15 | Audit trail disponível para consulta |
| Acesso aos dados | Art. 9, I | Art. 15 | Dados estão no sistema de arquivos local |
| Correção | Art. 18 | Art. 16 | Edição direta de arquivos |
| Exclusão | Art. 15 | Art. 17 | Exclusão de workspace/memória |
| Oposição | Art. 15 | Art. 21 | Opt-out de telemetria |
| Portabilidade | Art. 18, II | Art. 20 | Dados em formato JSON/markdown |

## 6. Aprovação

| Papel | Nome | Data |
|-------|------|------|
| Data Protection Officer | A definir | Pendente |
| Security Champion | A definir | Pendente |
| BDFL | anomalydao | 2026-07-18 |

## 7. Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-07-18 | IDEIA Core Team | Versão inicial |
