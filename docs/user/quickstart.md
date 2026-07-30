# Quickstart — IDEIA

**5 minutos para criar seu primeiro sistema.**

---

## 1. Instale

```bash
npm install -g @ideia/cli
```

*Pré-requisito: Node.js 20+*

## 2. Inicie um projeto

```bash
ideia init meu-primeiro-sistema
cd meu-primeiro-sistema
```

## 3. Descreva sua ideia

No chat da IDEIA, digite:

```
Crie uma API REST de tarefas com PostgreSQL e autenticação JWT
```

## 4. Acompanhe a execução

A IDEIA orquestra 6 agentes:
- **Analyst** — entende o requisito
- **Architect** — desenha a arquitetura
- **Programmer** — implementa o código
- **Reviewer** — verifica qualidade e segurança
- **Tester** — cria e executa testes
- **DevOps** — prepara o deploy

## 5. Veja o resultado

```
src/
├── routes/
├── controllers/
├── services/
├── models/
├── middlewares/
├── tests/
└── docs/
```

Testes passando, documentação gerada, audit trail registrado.

---

## Próximos passos

| Recurso | Onde |
|---------|------|
| Tutorial completo | `ideia tutorial start first-project` |
| Todos os comandos | `docs/user/api-reference/` |
| Deploy | `docs/user/deployment.md` |
| FAQ | `docs/user/faq.md` |

> **"Dê a ideia, nós entregamos a solução."**
