# Checklist de Code Review

## Arquitetura

- [ ] Sem regra de negocio no controller
- [ ] Sem acesso direto ao banco no use case
- [ ] Sem importacao direta de outro modulo

## Codigo

- [ ] Sem console.log em producao
- [ ] Sem PENDING_ACTION critico / magic strings / secrets hardcoded
- [ ] Nomes descritivos

## Testes

- [ ] Caso de sucesso testado
- [ ] Todos os erros testados
- [ ] Mocks recriados no beforeEach
- [ ] Padrao AAA seguido

## Seguranca

- [ ] Endpoint protegido se necessario
- [ ] Permissao verificada
- [ ] Dados sensiveis nao expostos
