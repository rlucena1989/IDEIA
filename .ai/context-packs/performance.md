# Context Pack: Performance — Optimization & Benchmarking

> **Use when:** Diagnosing or improving runtime performance, memory usage, bundle size, or throughput
> **Estimated tokens saved:** ~80%

## Relevant Files & Directories
- `docs/ESTUDOS/ESTUDO-PERFORMANCE-ESCALABILIDADE.md` — performance budgets, benchmarks, scaling strategy
- `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-BENCHMARKS-DADOS.md` — LLM, Vector DB, Message Broker benchmarks
- `packages/*/benchmarks/` — benchmark suites (k6, hyperfine, tinybench)
- `packages/*/src/**/*.ts` — source code to profile
- `tsconfig.json` / `vite.config.ts` / `webpack.config.js` — build configuration for bundle optimization
- `.ai/quality/ci-gate.md` — quality gates that include performance thresholds

## Key Domain Concepts
- **Performance Budgets:** Each module has max latency (TTFT, TPS), memory (heap), and size (bundle kB) budgets. Exceeding = gate failure.
- **Profiling First, Optimizing Second:** Never optimize without profiling data. Use `clinic.js`, `0x`, or Node.js `--prof` to find actual bottlenecks.
- **Bundle Optimization:** Tree-shaking, code splitting, dynamic imports, and removing dead code. Use `vite --analyze` or `webpack-bundle-analyzer`.
- **Caching Strategy:** Memoization (React), query caching (TanStack Query), CDN caching for static assets, in-memory caches with TTL.

## Common Patterns
- Profile with real workloads, not synthetic — use k6 scripts from `packages/*/benchmarks/`
- Measure before and after — document the improvement in the PR description
- Lazy-load heavy modules — `React.lazy()` for components, dynamic `import()` for libraries
- Avoid unnecessary re-renders — `React.memo`, `useMemo`, `useCallback` with measured impact
- Batch database/API calls — prefer bulk operations over N+1 queries
- Use streaming for large payloads — SSE, Node.js streams, or async generators

## Task-Specific Instructions
1. Define the performance target — which metric (TTFT, TPS, memory, bundle size) and what threshold
2. Profile the current state — run the relevant benchmark and record the baseline
3. Identify the bottleneck — use profiler output, not intuition
4. Apply the optimization — one change at a time, measuring after each
5. Verify no regression in correctness — run the test suite for the affected module
6. Update the performance budget if the optimization changes the module's capabilities
7. Run `npm run test:perf` to confirm the improvement meets the target

## Pitfalls
- Premature optimization — optimize only code that profiling shows is a bottleneck
- Optimizing for micro-benchmarks at the expense of real-world performance
- Adding caching without cache invalidation strategy — stale data is worse than slow data
- Ignoring memory leaks — a 2x speedup is useless if memory grows unbounded
- Forgetting mobile/low-end devices — test with CPU throttling and memory constraints

## Output Checklist
- [ ] Baseline measurement recorded before optimization
- [ ] Optimization applied to the actual bottleneck (profiling-verified)
- [ ] Correctness verified — all tests pass
- [ ] Performance improvement measured and documented
- [ ] Performance budget updated if needed
- [ ] Bundle size impact checked (for frontend changes)
- [ ] Memory leak check — no unbounded growth in long-running scenarios
