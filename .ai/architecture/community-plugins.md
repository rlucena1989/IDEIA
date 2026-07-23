# API de Plugins para Comunidade
> Versão: 1.0 | Atualizado em: 04/07/2026

## Visão Geral
O `ai-devkit` foi projetado com uma arquitetura "Core + Adapters". A comunidade pode (e deve) criar adaptadores para linguagens e frameworks não cobertos pelos plugins oficiais (ex: C#, Rust, Ruby, Elixir, Vue, etc).

## Regras de Contribuição de Adapters
Para criar um adapter compatível, o seu pacote NPM deve seguir estas convenções:
1. **Nomenclatura:** O nome do pacote publicado DEVE começar com `ai-devkit-adapter-` (ex: `ai-devkit-adapter-rust`).
2. **Registro Local:** Para ser descoberto pela CLI `ai-devkit init --lang rust`, basta instalar a dependência `npm install ai-devkit-adapter-rust --save-dev`.
3. **Obediência ao Adapter Contract:** O seu index.js deve respeitar o contrato estrito documentado em `.ai/architecture/adapter-contract.md` exportando funções para `lint`, `test`, e `qualityGate`.

## Processo de Submissão para "Golden Path"
Se o seu adapter estabilizar, você pode submetê-lo ao time central (via Pull Request para o core repo) junto com uma pasta de exemplo em `examples/golden-path-[seu-framework]`. 
A adoção aos repositórios oficiais requer uma cobertura de fitness functions superior a 90% (rastreabilidade de boundaries e rules estáticas adaptadas para o ecossistema alvo).
