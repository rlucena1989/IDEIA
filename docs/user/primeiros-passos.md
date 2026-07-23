# Guia de Primeiros Passos

## 1. Inicie a IDEIA

```bash
# Se instalou via CLI
ideia start

# Se instalou via desktop
# Execute o aplicativo IDEIA
```

Acesse `http://localhost:3000` no navegador (modo web) ou use a janela nativa (Electron).

## 2. Crie ou Abra um Projeto

### Novo Projeto

```
File → New Project → "meu-crud"
```

Ou via CLI:

```bash
ideia init meu-crud
cd meu-crud
```

### Projeto Existente

```
File → Open Folder → selecione a pasta do projeto
```

## 3. Conheça a Interface

```
┌─────────────────────────────────────────────────────┐
│  Menu │ Editor Monaco │   ║   │ Chat │ Dashboard   │
│       │              │   ║   │      │             │
│       │  Código       │   ║   │ IA   │ Métricas    │
│       │  com syntax   │ A │   │      │             │
│       │  highlight    │ B │   │      │             │
│       │              │ E │   │      │             │
│       │              │ R │   │      │             │
│       │              │ T │   │      │             │
│       │              │ O │   │      │             │
│       │              │ O │   │      │             │
│       │              │ L │   │      │             │
├───────┴──────────────┴───┴───┴──────┴─────────────┤
│  Terminal │ Output │ Problems │ Debug │             │
└─────────────────────────────────────────────────────┘
```

- **Editor Monaco**: Escreva e edite código com IntelliSense, lint, debug
- **Chat IA**: Descreva funcionalidades em linguagem natural
- **Dashboard**: Métricas de qualidade, segurança, cobertura
- **Terminal**: Shell integrado com PTY interativo

## 4. Descreva sua Primeira Feature

No painel de Chat, digite:

```
Crie um CRUD de usuários com autenticação JWT, 
armazenamento em PostgreSQL e testes unitários.
```

A IDEIA vai:
1. **Analisar** o pedido e classificar a intenção
2. **Planejar** a arquitetura (rotas, modelos, controllers)
3. **Gerar** o código completo
4. **Revisar** com o agente Reviewer
5. **Testar** com o agente Tester
6. **Apresentar** para aprovação

## 5. Aprove e Itere

Cada etapa do desenvolvimento passa por verificação:

```
🔍 Planejamento → [Aprovar/Revisar]
💻 Código → [Aprovar/Revisar]  
🧪 Testes → [Aprovar/Revisar]
📦 Deploy → [Aprovar/Revisar]
```

Use **Revisar** para pedir ajustes, **Aprovar** para confirmar.

## 6. Verifique a Qualidade

Abra o Dashboard para ver métricas em tempo real:

- **Cobertura de testes**: % do código coberto
- **Segurança**: Resultados do policy engine
- **Compliance**: Status LGPD/HIPAA/GDPR/SOC2
- **Performance**: TTFT, TPS, uso de memória

## 7. Próximos Passos

| Recurso | Onde Aprender |
|---|---|
| Policy Engine | `docs/user/policy-engine.md` |
| Pipeline de Deploy | `docs/user/delivery-pipeline.md` |
| AI Safety | `docs/user/ai-safety.md` |
| CLI Completa | `docs/user/api-reference/` |
| Arquitetura | `docs/architecture/` |
