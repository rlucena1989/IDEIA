# UI/UX Intelligence Engine

## Objetivo

Dar aos modelos de IA condições de projetar e implementar interfaces refinadas, acessíveis, agradáveis, consistentes, fluidas e intuitivas — com qualidade próxima a produtos de grandes empresas e sistemas operacionais modernos.

O ai-devkit não deve permitir que a IA entregue apenas "uma tela que funciona". A IA deve entregar uma experiência que o usuário entenda, confie e goste de usar.

---

## Problema

Modelos de IA costumam gerar interfaces com problemas como:

- Layout genérico.
- Falta de hierarquia visual.
- Espaçamento inconsistente.
- Estados incompletos.
- Microcopy pobre.
- Baixa acessibilidade.
- Fluxos confusos.
- Cores sem intenção.
- Componentes desalinhados.
- Falta de feedback.
- Responsividade fraca.
- Ausência de empty/loading/error states.
- Pouca consideração por aprendizado do usuário.
- Densidade visual inadequada.
- Falta de arquitetura de componentes.
- Falta de consistência entre telas.

---

## Princípios fundamentais

Toda interface deve aplicar:

1. Clareza.
2. Consistência.
3. Hierarquia visual.
4. Feedback imediato.
5. Previsibilidade.
6. Baixa carga cognitiva.
7. Acessibilidade.
8. Responsividade.
9. Performance percebida.
10. Confiança.
11. Elegância visual.
12. Continuidade entre telas.
13. Redução de atrito.
14. Facilidade de aprendizado.
15. Tolerância a erro.
16. Refinamento visual.
17. Arquitetura de componentes.
18. Coerência de linguagem.

---

## Camadas da inteligência de interface

Intenção do usuário
↓
Jornada
↓
Arquitetura da informação
↓
Layout
↓
Design system
↓
Componentes
↓
Estados
↓
Interações
↓
Microcopy
↓
Acessibilidade
↓
Responsividade
↓
Performance percebida
↓
Validação de qualidade

```

---

## O que a IA deve analisar antes de criar uma tela

Para qualquer tela, a IA deve responder:

- Quem usa?
- Com que frequência usa?
- Em que contexto usa?
- Qual é o objetivo principal?
- Qual é a ação primária?
- Quais são ações secundárias?
- O que o usuário precisa saber primeiro?
- O que pode ficar progressivamente revelado?
- Que erros podem ocorrer?
- Como o usuário se recupera de erros?
- Quais estados existem?
- Como essa tela se conecta ao resto do sistema?
- Qual padrão de navegação deve ser usado?
- Qual tom de linguagem é adequado?
- Quais dados são sensíveis?
- Como a tela funciona no mobile?
- Como a tela se comporta em desktop grande?
- Como a tela reduz esforço cognitivo?
- Como a tela transmite confiança?

---

## Tipos de tela e padrões esperados

| Tipo de tela | Padrões obrigatórios |
|---|---|
| Cadastro/Formulário | Field grouping, validação inline, estados, prevenção de erro |
| Listagem | Busca, filtro, ordenação, paginação, empty state |
| Dashboard | Hierarquia de métricas, filtros, contexto temporal, skeleton loading |
| Detalhe | Resumo, seções, ações contextuais, histórico |
| Configurações | Organização por categorias, confirmação de ações críticas |
| Login/Auth | Clareza, segurança, recuperação, mensagens cuidadosas |
| Onboarding | Progressão, orientação, redução de fricção |
| Admin | Densidade controlada, ações em lote, permissões visíveis |
| Checkout/Pagamento | Confiança, resumo, transparência, prevenção de abandono |
| Erro | Explicação, recuperação, suporte, ação clara |
| Sistema operacional / painel complexo | Navegação persistente, atalhos, densidade controlada, múltiplas regiões |

---

## Qualidade visual mínima

Toda UI deve definir:

- Grid.
- Espaçamento.
- Tipografia.
- Paleta de cores.
- Estados de foco.
- Estados hover/active/disabled.
- Bordas e radius.
- Sombras/elevation.
- Ícones.
- Densidade.
- Breakpoints.
- Animações discretas.
- Componentes reutilizáveis.
- Hierarquia de informação.
- Ritmo visual.
- Áreas de respiro.

---

## Estados obrigatórios

Toda tela ou componente assíncrono deve ter:

- Initial state.
- Loading state.
- Skeleton state, quando apropriado.
- Empty state.
- Error state.
- Success state.
- Disabled state.
- Validation state.
- Permission denied state, quando aplicável.
- Offline/degraded state, quando aplicável.

---

## Heurísticas de UX obrigatórias

Aplicar heurísticas consolidadas de usabilidade:

- Visibilidade do status do sistema.
- Correspondência entre sistema e mundo real.
- Controle e liberdade do usuário.
- Consistência e padrões.
- Prevenção de erro.
- Reconhecimento em vez de memorização.
- Flexibilidade e eficiência.
- Design minimalista.
- Ajuda para reconhecer e corrigir erros.
- Ajuda e documentação contextual.

---

## Design com baixo esforço cognitivo

A IA deve reduzir:

- Número de decisões simultâneas.
- Campos desnecessários.
- Texto excessivo.
- Ações duplicadas.
- Surpresas visuais.
- Mudanças bruscas de contexto.
- Mensagens técnicas para usuários finais.
- Cores competindo por atenção.
- Excesso de bordas, sombras ou cards.

---

## Microcopy

Mensagens devem ser:

- Humanas.
- Específicas.
- Curtas.
- Acionáveis.
- Não culpabilizadoras.
- Coerentes com o tom do produto.

Exemplo ruim:

> Erro 400.

Exemplo bom:

> Não foi possível criar o usuário. Verifique o e-mail e tente novamente.

Exemplo melhor:

> Este e-mail já está cadastrado. Use outro e-mail ou tente recuperar a senha.

---

## Acessibilidade mínima

Toda interface deve atender:

- Labels explícitos.
- Contraste adequado.
- Navegação por teclado.
- Estados de foco visíveis.
- Textos alternativos em imagens.
- ARIA apenas quando necessário.
- Ordem lógica de tabulação.
- Mensagens de erro associadas aos campos.
- Não depender apenas de cor para indicar estado.
- Componentes clicáveis com área adequada.
- Respeitar preferências de redução de movimento.

---

## Performance percebida

A IA deve considerar:

- Skeletons.
- Otimistic UI quando seguro.
- Lazy loading.
- Feedback imediato.
- Evitar bloqueios longos.
- Dividir formulários longos.
- Carregamento progressivo.
- Pré-busca quando fizer sentido.
- Transições suaves e rápidas.

---

## Responsividade

Toda UI deve ser pensada para:

- Mobile.
- Tablet.
- Desktop.
- Telas largas.
- Densidade de dados.
- Toque e mouse.
- Teclado.
- Diferentes níveis de zoom.
- Diferentes tamanhos de fonte.

---

## Regra de ouro

A IA deve sempre perguntar:

> Um usuário novo conseguiria entender esta tela em menos de 5 segundos?

Se a resposta for não, a tela precisa ser simplificada.
```
