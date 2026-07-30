# FAQ — IDEIA

> **Perguntas frequentes sobre o IDEIA.**

---

## 1. IDEIA é gratuito?

Sim! O núcleo do IDEIA é **open source** (licença MIT) e gratuito. Você pode usar todos os agentes especializados, chat, editor e pipeline de deploy sem pagar nada.

Planos pagos (Pro $29/mês, Enterprise $199/mês) adicionam funcionalidades avançadas: SSO, compliance, suporte prioritário, audit trail ilimitado e agentes customizados.

---

## 2. Preciso saber programar?

Não. O IDEIA foi feito para que **qualquer pessoa com uma ideia** possa transformá-la em software. Você descreve o que quer em linguagem natural, e a IDEIA faz todo o trabalho técnico.

Dito isso, se você sabe programar, consegue aproveitar melhor: editar código manualmente, revisar as decisões técnicas, e usar os níveis mais altos de autonomia.

---

## 3. Meus dados ficam seguros?

Sim. O IDEIA roda **100% local** por padrão. Seu código, suas preferências, seus projetos — tudo fica na sua máquina. Nada é enviado para servidores externos a menos que você opte explicitamente pelo sync cloud.

A trilha de auditoria é imutável (hash chain), e todo acesso a dados é registrado.

---

## 4. Funciona offline?

Sim! Essa é a principal vantagem do IDEIA sobre concorrentes como Cursor, Copilot e Devin. Com modelos locais (via Ollama), você roda **sem internet**. Internet só é necessária para:

- Deploy (enviar para produção)
- Sincronizar memória cross-projeto (se optar pelo cloud)
- Usar modelos cloud (OpenAI, Anthropic) como fallback

---

## 5. Quais linguagens suporta?

O IDEIA não é limitado a uma linguagem. O suporte depende dos modelos de IA que você usa e dos agentes disponíveis. As linguagens mais testadas são:

| Linguagem | Suporte |
|-----------|---------|
| TypeScript / JavaScript | Completo (NestJS, Next.js, React, Node) |
| Python | Completo (FastAPI, Django, Flask) |
| Go | Alto |
| Rust | Alto |
| Java / Kotlin | Moderado |
| PHP | Moderado |
| Ruby | Moderado |
| C# / .NET | Moderado |
| Swift | Básico |
| C / C++ | Básico |

---

## 6. Posso usar meu próprio LLM?

Sim! O IDEIA suporta qualquer modelo compatível com Ollama (Llama, Mistral, Phi, Qwen, DeepSeek, etc.) como provedor primário. Você também pode configurar modelos cloud (OpenAI, Anthropic, Gemini) para tarefas que exigem mais raciocínio.

O roteamento inteligente decide qual modelo usar para cada tarefa:
- Planejamento → modelo grande (raciocínio)
- Código simples → modelo pequeno (velocidade)
- Formatação → regras (sem LLM)

---

## 7. IDEIA vs Cursor?

Cursor é um editor de código com auto-completar turbinado. Ele **acelera a digitação**, mas você ainda precisa saber o que fazer, como fazer e quando fazer.

IDEIA **elimina o trabalho**: você descreve a ideia, e a IDEIA entrega o sistema completo — código, testes, deploy, documentação, CI/CD.

Cursor é um lápis mais rápido. IDEIA é quem desenha o quadro inteiro enquanto você toma café.

| Aspecto | Cursor | IDEIA |
|---------|--------|-------|
| Auto-completar | ✅ Excelente | ✅ Bom |
| Gerar código do zero | 🟡 Limitado | ✅ Completo |
| Planejar arquitetura | ❌ | ✅ |
| Testar e corrigir | ❌ | ✅ |
| Deploy | ❌ | ✅ |
| Documentar | ❌ | ✅ |
| Offline | ❌ | ✅ |
| Gratuito | 🟡 Trial | ✅ Open source |

---

## 8. IDEIA vs Copilot?

Copilot (GitHub) é excelente como auto-completar — sugere a próxima linha enquanto você digita. Mas não faz muito além disso.

IDEIA é um parceiro de engenharia completo. Enquanto Copilot sugere funções, IDEIA sugere sistemas.

---

## 9. IDEIA vs Devin?

Devin (Cognition) foi o primeiro "agente autônomo" de código. Mas:

- Devin roda na **nuvem** — seu código vai para servidores externos
- Devin **cobra por uso** — cada tarefa consuma créditos
- Devin **não aprende** entre projetos
- Devin é um único agente genérico

IDEIA é local, grátis (open source), aprende cross-projeto, e usa agentes especializados.

---

## 10. Como contribuir?

O IDEIA é open source (MIT) e contribuições são muito bem-vindas!

```bash
git clone <repo>
cd ideia
npm install
npm run build
```

Tipos de contribuição:

| Tipo | Descrição |
|------|-----------|
| **N0 — Bug report** | Reportar bugs e sugerir features |
| **N1 — PR com testes** | Corrigir bugs com testes |
| **N2 — Módulo completo** | Implementar módulo inteiro |
| **N3 — Feature complexa** | Orquestrar entrega cross-módulo |
| **N4 — Visão estratégica** | Definir roadmap e prioridades |

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

---

## 11. Tem suporte a time?

Sim! O IDEIA Enterprise suporta múltiplos membros no mesmo workspace, com:

- Controle de acesso (RBAC)
- Workspace compartilhado
- Trilha de auditoria unificada
- SSO / SAML / LDAP
- Deploy multi-ambiente

O plano Free é individual (1 usuário). O Pro suporta até 5 usuários. O Enterprise é ilimitado.

---

## 12. Funciona com Git?

Sim! O IDEIA gerencia Git automaticamente:

- Commits com mensagens no padrão conventional commits
- Branches por funcionalidade
- PRs prontos para revisão
- GitOps para deploy

Você pode interagir via chat:
```
"Commita as mudanças com mensagem 'feat: adiciona login Google'"
"Cria PR da branch atual"
```

---

## 13. Posso customizar os agentes?

Sim! O IDEIA é extensível. Você pode:

- **Criar agentes customizados** — defina o papel, as ferramentas e o comportamento
- **Modificar agentes existentes** — ajuste prompts, regras, qualidade gates
- **Publicar no Marketplace** — compartilhe com a comunidade (ganhe 70%)

```
"Quero criar um agente especializado em gerar relatórios PDF"
```

---

## 14. Como reportar bugs?

Abra uma issue no repositório com:

1. Descrição do bug
2. Passos para reproduzir
3. Comportamento esperado vs real
4. Logs (se aplicável)
5. Versão do IDEIA e do Node.js

Use o template de bug report disponível no repositório.

---

## 15. Como sugerir features?

Abra uma issue com a tag `enhancement` e descreva:

1. O problema que você quer resolver
2. Como você imagina a solução
3. Exemplos de uso
4. Por que isso é importante

Toda feature nova passa por **gap analysis** — verificamos se já existe algo similar planejado.

---

## 16. IDEIA é open source?

Sim! 100% open source sob licença MIT. O código completo está no repositório. Você pode:

- Usar livremente (inclusive comercialmente)
- Modificar e adaptar
- Distribuir cópias
- Auditar cada linha de código

A única exceção são funcionalidades enterprise (que são módulos fechados sobre a base open source).

---

## 17. Quais são os planos?

| | Free | Pro | Enterprise |
|--|:----:|:---:|:----------:|
| **Preço** | Grátis | $29/mês | $199/mês |
| **Projetos** | 1 simultâneo | 10 simultâneos | Ilimitados |
| **Agentes** | 5 oficiais | 10 oficiais | Todos |
| **Membros** | 1 | 5 | Ilimitados |
| **Modelos** | Locais + Free | Todos | Todos + privados |
| **Deploy** | Manual | 1-click | Multi-cloud |
| **SSO** | ❌ | ❌ | ✅ |
| **SLA** | ❌ | 99.5% | 99.9% |
| **Suporte** | Discord | Discord + Email | Prioritário 24/7 |

---

## 18. Como funciona o marketplace?

O Marketplace de Agentes é onde a comunidade publica e descobre agentes:

- **Agentes oficiais** — gratuitos, mantidos pela equipe IDEIA
- **Agentes da comunidade** — gratuitos ou pagos, criados por usuários
- **Agentes enterprise** — pagos, com suporte e garantia

Criadores de agentes ganham **70% do valor** das vendas. Para publicar:

1. Crie seu agente seguindo o SDK
2. Teste localmente
3. Publique no marketplace
4. Defina preço (grátis ou pago)
5. Receba 70% das vendas

---

## 19. Tem integração com VS Code?

Por enquanto, o IDEIA é uma IDE standalone baseada na plataforma Theia. Não é uma extensão do VS Code — é uma IDE completa com chat, editor, terminal e agentes integrados.

Estamos estudando uma extensão VS Code para o futuro, mas o foco atual é a IDEIA como produto próprio.

---

## 20. Como migrar do ai-devkit?

Se você já usa o ai-devkit, a migração para IDEIA é simples:

1. Instale o IDEIA: `npm install -g @ideia/cli`
2. Importe seus projetos: `ideia import ai-devkit`
3. A IDEIA converte automaticamente:
   - Configurações e preferências
   - Histórico de projetos
   - Memória e padrões aprendidos
   - Agentes customizados

O comando `ideia import` preserva tudo e não altera seus projetos existentes.

---

> **Ainda com dúvidas?** Abra uma issue no repositório ou pergunte no Discord da comunidade.
>
> *"Dê a ideia, nós entregamos a solução."*
