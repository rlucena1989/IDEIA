# Fronteiras Arquiteturais — v3

## Definição

v3 é o momento em que o ai-devkit passa de **ferramenta local** para **plataforma de governança e automação**.

```
v2                     v3
───                    ───
Ferramenta CLI         Plataforma com API
Execução manual        Serviço orquestrado
Estado local           Estado persistente e remoto
Comando único          Fluxo multitarefa
Sem contratos          Contratos formais
Acoplado a fs          Armazenamento abstrato
```

---

## Módulos por categoria

### 1. Refatorar para plataforma (keep as-is? Não. Refatorar? Sim.)

| Módulo     | Situação                                      | O que fazer                                                         |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------- |
| governance | 4 módulos acoplados a JSON local              | Abstrair armazenamento; expor API de registry/resolver/policy/audit |
| planning   | TaskSpec + ExecutionPlan + router + validator | Virar serviço com estado; executar via API                          |
| coverage   | reader + prioritizer + repair + status        | Virar pipeline orquestrado; status persistente                      |
| runtime    | 49 módulos fortemente acoplados               | Extrair motor de execução; encapsular por domínio                   |
| security   | baseline + detector acoplados a fs            | API de políticas + identidade                                       |
| localAi    | providers + RAG + embeddings                  | Virar provider plugável na orquestração                             |

### 2. Substituir na v3 (adapter de transporte)

| Módulo     | Situação                          | O que fazer                                          |
| ---------- | --------------------------------- | ---------------------------------------------------- |
| CLI        | 85 comandos com lógica de negócio | Extrair domínio; CLI vira thin adapter que chama API |
| extension  | 40 comandos + 7 views             | Vira cliente HTTP da API; não executa CLI direto     |
| adapters   | 13 adapters de linguagem          | Virar plugins registrados via API                    |
| plugins    | plugin system incipiente          | SDK formal + marketplace                             |
| generators | 31 geradores                      | Templates no marketplace da plataforma               |

### 3. Manter como está (já tem boa separação)

| Módulo    | Motivo                                                       |
| --------- | ------------------------------------------------------------ |
| contracts | Já tem validator, linter, differ, generator. Bom isolamento. |
| release   | notes, preparer, publisher. Boa separação de concerns.       |

---

## Limites da v2 que não devem ser carregados

1. **Lógica acoplada à CLI** — comandos em `commands/*.ts` misturam parser (commander) com regra de negócio
2. **Estado sem contrato** — `settings.json`, `autonomy-status.json`, `project_history.json` sem schema formal
3. **Dependência forte de fs local** — `readFileSync`/`writeFileSync` espalhados, sem passar pelo IO layer
4. **Sequência manual** — `plan create → validate → status` exige intervenção humana; v3 deve orquestrar

---

## Diagrama de fronteiras

```
┌─────────────────────────────────────────────────────┐
│                     v3 Platform                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │Governance│ │Planning  │ │Autonomy (coverage)    │ │
│  │ API      │ │ Service  │ │ Pipeline              │ │
│  └────┬─────┘ └────┬─────┘ └──────────┬───────────┘ │
│       │            │                  │              │
│  ┌────▼────────────▼──────────────────▼───────────┐ │
│  │           Core Engine (runtime)                 │ │
│  │  Task Queue · State Store · Audit Log           │ │
│  └────────────────────┬───────────────────────────┘ │
│                       │                              │
│  ┌────────────────────▼───────────────────────────┐ │
│  │              Transport Layer                    │ │
│  │  CLI (thin) · Extension (client) · REST API    │ │
│  │  Webhook · MCP Server · Plugin SDK             │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```
