# Convencoes de Nomenclatura de Eventos

- Formato: `dominio.entidade.acao` (ex.: `orders.order.created`).
- Usar verbos no passado para fatos ja ocorridos.
- Versionar eventos quando o payload mudar de forma incompativel: `orders.order.created.v2`.
