# POLÍTICA DE PRIVACIDADE — IDEIA

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | 2026-07-26 | IDEIA Privacy Team | Versão inicial |

## 1. Introdução

A IDEIA ("nós", "nosso") está comprometida com a proteção da privacidade dos dados pessoais dos seus usuários ("titulares"). Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos os dados pessoais no ecossistema IDEIA, em conformidade com:

- **LGPD** — Lei Geral de Proteção de Dados (Lei nº 13.709/2018, Brasil)
- **GDPR** — General Data Protection Regulation (Regulamento UE 2016/679, União Europeia)
- **ISO 27001** — International Standard for Information Security Management
- **SOC 2** — Service Organization Control 2 (Trust Services Criteria)

## 2. Definições

- **Dados Pessoais**: Qualquer informação relacionada a pessoa natural identificada ou identificável
- **Tratamento**: Toda operação realizada com dados pessoais (coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação, avaliação, controle, modificação, comunicação, transferência, difusão ou extração)
- **Titular**: Pessoa natural a quem os dados pessoais se referem
- **Controlador**: IDEIA — responsável pelas decisões sobre o tratamento de dados
- **Encarregado (DPO)**: security@ideia.dev
- **Consentimento**: Manifestação livre, informada e inequívoca pela qual o titular concorda com o tratamento

## 3. Dados Coletados

### 3.1 Dados Fornecidos pelo Usuário

- Informações de cadastro (nome, email, organização)
- Preferências de configuração da IDEIA
- Conteúdo de interações com assistentes de IA (prompts, comandos, solicitações)
- Projetos e repositórios configurados

### 3.2 Dados Coletados Automaticamente (Telemetria)

*Nota: A telemetria é **opt-in apenas**. Nenhum dado é coletado sem consentimento explícito.*

- Métricas de uso agregadas (comandos executados, funcionalidades acessadas)
- Informações de desempenho (tempo de resposta, erros)
- Informações do ambiente (versão do sistema operacional, versão do Node.js)

### 3.3 Dados que NÃO Coletamos

- Dados biométricos
- Dados de saúde
- Dados de crianças sem verificação de consentimento parental
- Dados sensíveis (origem racial/étnica, convicção religiosa, opinião política, filiação sindical)
- Informações de cartão de crédito ou pagamento
- Senhas em texto puro

## 4. Finalidades do Tratamento

| Finalidade | Base Legal (LGPD) | Base Legal (GDPR) |
|------------|-------------------|-------------------|
| Fornecimento da plataforma IDEIA | Execução de contrato (Art. 7º, V) | Performance of contract (Art. 6(1)(b)) |
| Melhoria da experiência do usuário | Legítimo interesse (Art. 7º, IX) | Legitimate interests (Art. 6(1)(f)) |
| Suporte técnico | Execução de contrato (Art. 7º, V) | Performance of contract (Art. 6(1)(b)) |
| Segurança e auditoria | Obrigação legal (Art. 7º, II) | Legal obligation (Art. 6(1)(c)) |
| Comunicações sobre atualizações | Consentimento (Art. 7º, I) | Consent (Art. 6(1)(a)) |

## 5. Consentimento

O consentimento é gerenciado através do `ConsentManager`:

- **Opt-in explícito**: Todo tratamento de dados requer consentimento prévio e explícito
- **Finalidades específicas**: O consentimento é granular por finalidade (telemetria, comunicação, etc.)
- **Revogação**: O titular pode revogar o consentimento a qualquer momento através do comando `consent revoke`
- **Expiração automática**: Consentimentos expiram após período configurável
- **Registro**: Todos os consentimentos são registrados com timestamp e SHA-256

## 6. Direitos dos Titulares

A IDEIA garante todos os direitos previstos na LGPD e GDPR:

### 6.1 Acesso (LGPD Art. 9º / GDPR Art. 15)
O titular pode solicitar confirmação da existência de tratamento e acesso aos seus dados.
```
ai privacy dsr create <userId> access "Descrição"
```

### 6.2 Retificação (LGPD Art. 18, III / GDPR Art. 16)
O titular pode solicitar correção de dados incompletos, inexatos ou desatualizados.

### 6.3 Eliminação (LGPD Art. 18, VI / GDPR Art. 17)
Direito ao esquecimento — eliminação dos dados do titular.
```
ai forget user <userId> --reason "Solicitação do titular"
```

### 6.4 Portabilidade (LGPD Art. 18, V / GDPR Art. 20)
O titular pode solicitar a exportação dos seus dados em formato estruturado.

### 6.5 Informação (LGPD Art. 9º / GDPR Art. 13-14)
Transparência sobre entidades públicas e privadas com as quais o controlador compartilhou dados.

### 6.6 Explicação (LGPD Art. 20 / GDPR Art. 22)
Direito à explicação sobre decisões automatizadas.
```
ai explain privacy --decision-id <id>
```

### 6.7 Oposição (LGPD Art. 18, §2º / GDPR Art. 21)
Direito de se opor ao tratamento realizado com base em legítimo interesse.

### 6.8 Revisão (LGPD Art. 20 / GDPR Art. 22)
Direito de solicitar revisão de decisões automatizadas por humano.

## 7. Retenção de Dados

A IDEIA implementa retenção configurável através do `DataRetentionManager`:

| Categoria de Dados | Período de Retenção Padrão | Justificativa |
|--------------------|---------------------------|---------------|
| Logs de auditoria | 12 meses | Obrigação legal e segurança |
| Registros de consentimento | 5 anos após revogação | Comprovação de conformidade |
| Métricas de telemetria | 6 meses | Melhoria do serviço |
| Cache de prompts | 30 dias | Performance |
| Dados de usuário | Até solicitação de eliminação | Execução do serviço |

A eliminação automática (auto-purge) é executada diariamente.

## 8. Medidas de Segurança

### 8.1 Medidas Técnicas

- **Criptografia**: AES-256 para dados em repouso, TLS 1.3 para dados em trânsito
- **Auditoria**: Hash chain com SHA-256 para integridade do audit trail
- **Detecção de PII**: PIIDetector com 30+ padrões para detecção automática de dados pessoais
- **Controle de acesso**: RBAC via policy-engine com políticas Cedar
- **Anonimização**: Anonymizer e AnonymizationPipeline para sanitização de dados
- **Output validation**: Validação de saída com detecção de PII (31 regras)
- **Sandbox**: Execução isolada com vm.Script (não new Function)
- **Prevenção de vazamento**: Secrets scan em toda saída

### 8.2 Medidas Organizacionais

- Política de privacidade por design (privacy-by-design)
- Relatório de Impacto à Proteção de Dados (DPIA) documentado
- Plano de resposta a incidentes
- Auditoria funcional periódica
- Matriz de compliance segurança

## 9. Compartilhamento com Terceiros

**Política padrão: Nenhum compartilhamento com terceiros.**

A IDEIA não compartilha, vende, aluga ou comercializa dados pessoais com terceiros, exceto:

1. **Obrigação legal**: Quando requisitado por autoridade competente (com notificação ao titular, quando permitido)
2. **Processadores**: Serviços de infraestrutura (cloud hosting) com garantias contratuais de proteção de dados
3. **Com consentimento**: Mediante consentimento explícito do titular para finalidade específica

Todos os processadores de dados são contratualmente obrigados a cumprir com LGPD/GDPR.

## 10. Transferências Internacionais

A IDEIA opera em infraestrutura cloud com data centers no Brasil e Estados Unidos.

- Dados de titulares brasileiros: processados preferencialmente no Brasil
- Dados de titulares europeus: processados preferencialmente na UE
- Transferências: realizadas com garantias adequadas (Cláusulas Contratuais Padrão - SCCs)

## 11. Incidentes de Segurança

### 11.1 Procedimento

1. **Detecção**: Monitoramento contínuo e alerts do sistema
2. **Classificação**: Avaliação de severidade e impacto
3. **Contenção**: Isolamento imediato do vetor
4. **Notificação**: 
   - LGPD: Até 72h para ANPD e titulares afetados
   - GDPR: Até 72h para autoridade de controle competente
5. **Remediação**: Correção da vulnerabilidade
6. **Documentação**: Registro completo no audit trail

### 11.2 Contato para Reportar Incidentes

security@ideia.dev

## 12. Encarregado (DPO)

| Atributo | Detalhe |
|----------|---------|
| Nome | Encarregado de Dados IDEIA |
| Email | security@ideia.dev |
| Responsabilidades | Orientação, conformidade, ponto de contato com ANPD e titulares |

## 13. LGPD/GDPR Compliance Statement

A IDEIA declara estar em conformidade com:

- Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
- General Data Protection Regulation (GDPR - EU 2016/679)
- ISO 27001:2022 (Information Security Management)
- SOC 2 Type II (Trust Services Criteria)
- EU AI Act (Proposal COM/2021/206)

A conformidade é verificável através do comando:
```
ai compliance check gdpr
ai compliance check lgpd
```

## 14. Atualizações desta Política

Esta política pode ser atualizada periodicamente. Notificaremos os titulares sobre alterações substanciais com 30 dias de antecedência.

**Versão atual**: 1.0 (2026-07-26)

## 15. Contato

Para exercer seus direitos, reportar incidentes ou esclarecer dúvidas:

- **Email**: security@ideia.dev
- **Comando CLI**: `ai privacy dsr create <userId> <type> <description>`
- **Direito ao esquecimento**: `ai forget user <userId>`

---

*Documento mantido em docs/PRIVACY.md. Versão controlada por git.*
