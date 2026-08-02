# Íris — Plano Fase 8: Performance (north star #1)

> A Fase 8 é a primeira após o rebranding (Fases 0–7, fechadas nos PRs #1–#10) e abre a trilha de
> prioridades do `ROADMAP.md`: **Performance primeiro** (recursos ociosos menores, startup mais
> rápido, instalação menor), depois Stability, depois polish. Nenhuma tela muda de visual — a Fase 8
> mexe em arquitetura de entrada do renderer e em instrumentação.
>
> Referências: spec `docs/superpowers/specs/2026-07-29-iris-leve-design.md` (tabela de métricas e
> §Tratamento de erro), `perf-budgets.json`, `scripts/bench/*`, `vite.config.ts`, `electron/windows.ts`.

## 1. Contexto — o que o histórico mostra

O baseline pós-Fase 7 (medidas de CI, 2026-08-01):

| Métrica | Medido | Budget | Folga |
|---|---|---|---|
| `startup.hudFirstFrame` | ~9.240 ms | 9.000 ms | **negativa (flaky)** |
| `memory.idle.total` | 505.352 (~505 MB) | 540.557 | ~7% |
| `bundle.total` | 3.615.787 | 3.619.000 | **<0,1%** |
| `transformers.js` / `pixi` | 820 KB / 542 KB | fora do caminho de startup | — |

**Descobertas estruturais:**

- **Todas as janelas executam a SPA inteira.** `electron/windows.ts` cria 5 janelas
  (hud, editor, source-selector, notes, countdown) e cada uma carrega o mesmo `index.html` com o
  mesmo entry: `index.js` (606 KB) + `react-vendor.js` (457 KB) + `phosphor-icons.js` (212 KB) +
  `index.css` (73 KB) ≈ **1,35 MB de JS parseado por renderer**. A HUD (uma barrinha de 600×160) paga
  o mesmo boot que o editor. É a causa raiz do `hudFirstFrame` no limite e de ~505 MB ociosos em 4
  processos (Browser 221 + Tab 135 + Utility 89 + GPU 60).
- **Bom, não mexer:** `transformers.js` vive só num worker (`transcribe.worker.ts`) e `pixi` só em
  chunks lazy do editor (`VideoPlayback` etc.) — nenhum no caminho de startup. `VideoEditor` já é
  `lazy()` em `App.tsx`.
- **Gap de instrumentação:** a spec (§Estratégia de teste e medição) promete métricas **Render**
  (contagem de re-renders em scrub/zoom/drag) e **Captura** (frames perdidos), mas `perf-budgets.json`
  não tem budgets para elas. `src/lib/perf/renderCounter.tsx` existe com teste e **não é referenciado
  em nenhum lugar**.
- **Hex legado fora da varredura:** `electron/windows.ts:207` e `:236` ainda usam `#09090b`
  (near-black legado). O guardrail `noLegacyColors` só varre `src/`, então `electron/` vazou.

## 2. Restrições globais (herdadas dos planos 0–7)

- Cada fase termina com `npm run test`, `npx tsc --noEmit`, `npm run lint` e budgets verdes; cada PR
  é mergeável sozinha e o app permanece utilizável.
- Mudança de janela/layer exige verificação manual nas três plataformas antes do merge (spec §Riscos).
- Nenhum valor visual muda: tokens, `Glass`, `prefers-reduced-motion` e guardrails intocados.
- Teste para cada comportamento novo no mesmo pacote; guardrail/`perf-budgets.json` atualizados na
  mesma PR.
- Ícones/cores só dos tokens; `#34B27B` e `#09090b` banidos (exceto `tokens/color.ts`).

## 3. Tasks

### Task 8.1 — Entrada por tipo de janela (entry split) — o bloco dominante

**Meta:** a HUD (e depois notes/countdown/source-selector) deixa de bootar a SPA inteira.

- [x] Vite multi-page: `rollupOptions.input = { index, hud }` com `hud.html`; `createHudOverlayWindow`
  passa a carregar `hud.html` (query `windowType` some para a HUD — o entry já *é* a HUD).
- [x] O entry HUD importa só o que a HUD usa (`components/hud/*`, tokens, `Glass`, i18n). Sem `App.tsx`,
  sem `loadAllCustomFonts`, sem `clearStaleSourceCache`, sem o `VideoEditor` lazy.
- [ ] Estender o mesmo padrão, janela a janela, na ordem de ganho: HUD → source-selector → countdown →
  notes. Cada conversão é uma PR pequena, com smoke nas 3 plataformas (HUD é click-through — regra da
  spec). *(source-selector/countdown/notes ficam para a fase seguinte se o smoke da HUD exigir re-trabalho.)*
- [x] **Guardrail novo:** `noHudEntryLeak.test.ts` — prova que o entry `hud.html` não importa `App.tsx`
  nem `VideoEditor` (via grafo de import estático), e budget `bundle.hud.js` novo em
  `perf-budgets.json` (alvo inicial: ≪606 KB; apertar nas medidas).
- [x] Reusar o `manualChunks` existente (react-vendor/phosphor/pixi) para não duplicar chunk no total.

**Medidas 8.1 (build fresh):** `bundle.total = 3.614.418` (↓ vs Fase 7), `bundle.hud.js = 55.564` (alvo
≪606 KB ✅), `bundle.index.js = 536.282` (↓, App sem `LaunchWindow`), `bundle.color.js = 3.728` (novo
chunk compartilhado `userPreferences`/`editorDefaults`, carregado só por HUD + VideoEditor lazy — sem
duplicação). Janela HUD ≈ 1.224 KB parse (-12,5% vs SPA inteira); editor ≈ 1.873 KB (-3,5%).

**Achado para 8.2/8.4:** `src/i18n/loader.ts:9` usava `import.meta.glob("./locales/**/*.json", { eager: true })`
→ **13 locales + todos os namespaces (~315 KB raw) eram embutidos no chunk compartilhado carregado por
todas as janelas no startup** (dominavam os 370 KB do shared chunk que a HUD paga). **Resolvido na 8.4b**
(PR #14): glob não-eager + `loadLocale()` dinâmico — só o locale ativo (~25 KB) carrega no boot; o
shared `index.js` caiu de 370 KB → 79 KB.

**Critério de saída:** `hudFirstFrame` com folga real (não só "passa o budget") e `memory.idle.*`
medindo a queda por janela convertida.

### Task 8.2 — Instrumentar "Render" (promessa da spec)

- Ativar a contagem de re-renders em cenários fixos: `scripts/bench/render.ts` (Playwright headless,
  mesmo infra de `test:browser`) medindo renders de componentes em scrub/zoom/arrastar região sobre
  fixture fixa.
- Budgets novos em `perf-budgets.json` (ex.: `render.scrub`, `render.zoom`, `render.drag`) + job no
  CI. `renderCounter.tsx` ganha uso real ou é substituído por medição equivalente com teste.
- Independente de 8.1 (não compartilha arquivos) — pode andar em paralelo.

**Entregue (PR #12, `19a4f919`):** em vez do `scripts/bench/render.ts` (Playwright externo), a medição
é um teste **browser** (`src/lib/perf/renderBudgets.browser.test.tsx`) que monta o `TimelineEditor`
real com `createRenderProfiler` (React `<Profiler>`, commits do subtree) e conta renders em 3 cenários
fixos — `render.scrub` (20 pointermoves no bg), `render.zoom` (20× `z`), `render.drag` (20 pointermoves
no `document`). Budgets `count`: `render.scrub` 40 / `render.zoom` 40 / `render.drag` 60. Medidas
reais: 21 / 20 / ~31 commits por 20 interações (~2× folga). Achado de debug: o dnd-kit `PointerSensor`
escuta `pointermove` no `document`, não no `window` — disparar em `window` não engaja o drag. Job do
CI (`test:browser`) já valida; Gate 8.2 fecha nesta PR.

### Task 8.3 — Métrica "Captura" (stretch, adiável)

- Frames perdidos por minuto sobre fonte sintética no renderer (sem native, roda em CI Linux).
- Só se 8.2 abrir o caminho da infra; caso contrário, fica para a Fase de Stability.

### Task 8.4 — Memória ociosa e trabalho por janela

- Depois de 8.1, re-medir `memory.idle.*` e apertar os budgets com as novas medidas.
- Tirar do entry de janela leve o que só o editor precisa: `loadAllCustomFonts` e
  `clearStaleSourceCache` rodam hoje em **toda** janela via `App.tsx`/`main.tsx` (duplicado também o
  background transparente em `main.tsx` e `App.tsx`). Gate por `windowType` ou por entry.
- Cortar a duplicação `transparent` (`main.tsx:19-28` vs `App.tsx:34-38`).

**8.4a (PR #13):** `loadAllCustomFonts` gateado ao editor (`windowType === "editor"`) com teste novo
(`src/App.test.tsx` — 3 casos: editor carrega, leves não) e bloco `transparent` do `App.tsx` removido
(era redundante com `main.tsx`, que já cobre source-selector/countdown/notes pré-render). **Não mexi
nos budgets `memory.idle.*` nesta PR**: a máquina local mede GPU ~145 MB estável (swiftshader) vs
63 MB do budget e `hudFirstFrame` 65 s vs 9 s — o CI Linux é o número canônico (8.1 passou nele) e o
Gate 8.4/8.6 reapreta sobre medida de CI.

**8.4b (PR #14):** i18n lazy — `loader.ts` com `import.meta.glob` não-eager (1 chunk por
locale/namespace), `loadLocale()` popula o cache síncrono e `I18nProvider` hidrata antes de renderizar
(carrega só o locale ativo ~25 KB; `getAvailableLocales`/`getLocaleName` continuam síncronos via chaves
do glob). Testes: `src/i18n/loader.test.ts` (5) e browser test pré-carrega `en`. Build: shared
`index.js` 370 kB → 79 kB; novos grupos `bundle.{common,dialogs,editor,launch,settings,shortcuts,timeline}.js`
(orçados como agregação em disco — no boot só um locale carrega). **Nota:** `npm run i18n:check` já
falha no main (traduções fora de sync, `buttons.autoZoomOn`) — pré-existente, fora do escopo da fase.

### Task 8.5 — Consistência: hex legado em `electron/`

- `electron/windows.ts:207` (`backgroundColor: "#09090b"`) e `:236` (`insertCSS … #09090b`) → literal
  do token `#0A0A0C` (var CSS não alcança o BrowserWindow; usar o literal de `tokens/color.ts`).
- Estender `noLegacyColors` a `electron/` (nova varredura + teste que pega o ofensor). Zero mudança
  visual.

### Task 8.6 — Budgets e docs

- `perf-budgets.json` re-apertado sobre medida fresca (`npx vite build` → `npm run bench:bundle`),
  incluindo os budgets novos de 8.1/8.2.
- `AGENTS.md`: documentar a convenção de entries por janela (onde mora `hud.html`, o que pode/não
  pode importar). Checklist perf por janela.

## 4. Sequenciamento

```
8.1 (HUD → janelas leves, PRs pequenas) → 8.4 (re-medir + cortar trabalho)
8.2 em paralelo (arquivos distintos) → 8.3 (só se 8.2 abrir caminho) → 8.5 (pequeno) → 8.6
```

Cada PR da 8.1 é isolada e verificável; 8.5 e 8.6 podem ir juntos no fim da fase.

## 5. Riscos

- **Entry split engorda o total:** duas entries podem duplicar CSS/ícones. Mitigado reusando
  `manualChunks` e medindo `bundle.total` a cada PR — se subir, converter janela a janela e apertar
  depois.
- **Janela leve quebra algo do editor por omissão:** o guardrail de import (8.1) prova que a HUD não
  importa `App.tsx`; smoke nas 3 plataformas é gate da PR.
- **Render bench flaky (xvfb, igual ao `hudFirstFrame`):** margem maior nos budgets ou retry no job.
- **`memory.idle.*` mede tendência, não absoluto** (CI Linux) — números de plataforma ficam no job
  manual nos marcos, como a spec aceita.

## 6. Definição de pronto (todas as PRs da fase)

- [ ] `npm run test` (Vitest) verde, incluindo guardrails novos.
- [ ] `npx tsc --noEmit` sem erros; `npm run lint` (Biome) limpo.
- [ ] `npm run bench:*` dentro dos orçamentos de `perf-budgets.json` (medida fresh — armadilha do
      `dist` stale).
- [ ] Zero hex legado em `src/` e `electron/`; guardrail cobre a varredura estendida.
- [ ] Cada janela convertida com smoke nas 3 plataformas antes do merge da PR.

## 7. Gates da fase

- [ ] Gate 8.1 — HUD em entry própria; `hudFirstFrame` com folga real (alvo: ≪9.000 ms) e
      `memory.idle.*` em queda medida.
- [ ] Gate 8.2 — `bench:render` no CI com budgets de scrub/zoom/drag.
- [ ] Gate 8.4 — budgets de memória re-apertados nas medidas pós-8.1.
- [ ] Gate 8.5 — `#09090b` fora de `electron/`; `noLegacyColors` varre `electron/`.
- [ ] Gate 8.6 — budgets frescos documentados; `AGENTS.md` com a convenção de entries.
- [ ] Gate 8.7 — smoke manual macOS (HUD/recording é native-fragile — ver AGENTS.md) antes do merge
      da fase.
