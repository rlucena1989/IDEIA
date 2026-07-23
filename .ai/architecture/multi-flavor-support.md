# Suporte a "Flavors" (Microservices, Event-Driven, Serverless)
> Versão: 1.0 | Atualizado em: 04/07/2026

## Modular Monolith como Ponto de Partida
O Modular Monolith é o flavor (sabor) padrão. Cada projeto `.ai/` que nasce via `npx ai-devkit init` adota esse formato pois garante a melhor relação entre manutenibilidade inicial e facilidade de escala.

## Transição para Outros Flavors
Quando o `ai-devkit` identificar flags avançadas no CLI (ex: `--flavor serverless`), ele desativa as fitness functions monolíticas e carrega matrizes de verificação especializadas:

### Serverless (AWS Lambda / Cloud Functions)
- **Quality Gate Alternativo:** Bloqueia instâncias mantidas em memória entre requisições globais pesadas. Força o uso do `Contract.ts` acoplado diretamente ao payload do API Gateway.
- **AI Handoff Modificado:** Exige que a IA documente o tamanho do pacote gerado (bundle size limit).

### Event-Driven / Microservices (Kafka / RabbitMQ)
- **Quality Gate Alternativo:** Desativa a restrição "módulos não podem conversar exceto via index.ts", forçando a regra: "módulos conversam APENAS via payload injetado no Message Broker".
- **AI Handoff Modificado:** A IA é obrigada a validar os schemas (AsyncAPI) antes de gerar o código consumidor/produtor no `domain/`.
