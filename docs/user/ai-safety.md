# AI Safety — IDEIA

> Guia de segurança e alinhamento de IA

## Sumário

1. [Jailbreak Detection](#1-jailbreak-detection)
2. [Prompt Guard](#2-prompt-guard)
3. [Content Filter](#3-content-filter)
4. [Model Safety Router](#4-model-safety-router)
5. [Human-in-the-Loop](#5-human-in-the-loop)
6. [Audit Chain](#6-audit-chain)
7. [Bias Detection](#7-bias-detection)
8. [Rate Limiting](#8-rate-limiting)
9. [Alignment Tests](#9-alignment-tests)

---

## 1. Jailbreak Detection

O `JailbreakDetector` analisa prompts contra 9 categorias de padrões conhecidos:

| Categoria | Padrões | Severidade |
|-----------|---------|------------|
| Instruction Override | `ignore previous instructions`, `forget prior directions` | Crítica |
| DAN Mode | `act as DAN`, `developer mode`, `jailbreak` | Crítica |
| Prompt Extraction | `print system prompt`, `repeat everything above` | Crítica |
| Malicious Role Play | `you are now a hacker`, `pretend to be evil` | Alta |
| Encoded Payloads | Base64, hex, URL encoding | Alta |
| Harmful Content | Weapons, hacking, drugs | Alta |
| Token Abuse | Token/context limit manipulation | Média |
| Recursive Loop | Loop/repeat abuse | Baixa |
| Admin Impersonation | `I am the admin`, `you must obey me` | Alta |

```typescript
const detector = new JailbreakDetector();
const result = detector.analyze(prompt);
if (result.detected && result.overallSeverity === 'critical') {
  // Block the request
}
```

## 2. Prompt Guard

O `PromptGuard` combina jailbreak detection + content filter + sanitização:

```typescript
const guard = new PromptGuard();
const result = await guard.guard(userInput);
if (!result.allowed) {
  console.log(`Blocked: ${result.reason}`);
}
```

## 3. Content Filter

Filtra conteúdo em 6 categorias:

- Hate speech → Block
- Violence → Block
- Sexual content → Warn
- Personal info → Warn (>2 occurrences)
- Financial data → Block
- Malicious code → Block

## 4. Model Safety Router

Roteia requisições para o modelo mais seguro disponível:

```typescript
const router = new SafetyRouter({ minSafetyScore: 0.85 });
const decision = router.route('code', { requiresHighSafety: true });
// decision.model -> 'gpt-4o' (score 0.95)
```

## 5. Human-in-the-Loop

Ações críticas requerem aprovação humana em 3 níveis:

| Criticalidade | Papel Aprovador | Timeout |
|---------------|-----------------|---------|
| Low | Dev | 5 min |
| Medium | Dev | 5 min |
| High | Tech Lead | 5 min |
| Critical | Security | 5 min |

## 6. Audit Chain

Todas as decisões de IA são registradas com hash chain SHA-256:

```typescript
const auditor = new AIDecisionAuditor();
auditor.recordSimple({ agentId, actionType, input, output, model, safetyScore, ... });
const chain = auditor.createChain('session-123', decisions);
const verify = auditor.verifyChain('session-123');
```

## 7. Bias Detection

Detecta 6 tipos de viés em outputs:

- Gênero
- Racial
- Idade
- Socioeconômico
- Cultural
- Confirmação

## 8. Rate Limiting

```typescript
const limiter = new RateLimiter({
  llm: { windowMs: 60000, maxRequests: 20, blockDurationMs: 60000, trackBy: 'user' }
});
const result = limiter.check('user:123', 'llm');
```

## 9. Alignment Tests

```bash
node scripts/alignment-tests.js              # Run all
node scripts/alignment-tests.js --verbose    # Detailed
node scripts/alignment-tests.js --json       # JSON report
```

Cobre: jailbreak resistance, content safety, bias, prompt injection, sycophancy, reward hacking, data privacy.
