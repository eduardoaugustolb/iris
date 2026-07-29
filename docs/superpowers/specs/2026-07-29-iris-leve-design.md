# Íris — Leve, Fluido e Verificável

**Data:** 2026-07-29
**Status:** aprovado, pendente de plano de implementação

## Objetivo

Transformar o Íris em um app mensuravelmente mais leve (memória, CPU, GPU, disco), com fluidez
comparável à do ecossistema Apple, sem remover nenhuma funcionalidade atual, e com a interface
inteira reconstruída segundo `DESIGN.md` e `UX-PRINCIPLES.md`. Cada ganho precisa ser provável por
número, não por impressão.

## Escopo e não-escopo

**No escopo**

- As três plataformas continuam suportadas (macOS, Windows, Linux). O corte macOS-only descrito em
  `README.md` e `ROADMAP.md` **não** se aplica ao código.
- Estética idêntica à do ecossistema Apple, com implementação 100% própria — sem depender de
  ativos, fontes ou bibliotecas de ícones da Apple.
- Redução de consumo de recursos e aumento de fluidez.
- Instrumentação de performance com orçamentos que quebram o CI.

**Fora do escopo**

- Remover ou degradar qualquer feature listada em `README.md#core-features`.
- Trocar o runtime (ver "Decisões" → Electron).
- Reescrita do pipeline nativo de captura (`screencapturekit/`, `wgc-capture/`) — ele só é tocado
  onde a instrumentação exigir.

## Decisões tomadas

### Electron permanece

O pipeline depende de WebCodecs e APIs de mídia do Chromium: 33 usos de `VideoDecoder`, 19 de
`VideoEncoder`, 29 de `MediaRecorder`, além de `SharedArrayBuffer` e `OffscreenCanvas`. Tauri não
embute runtime — usa WebView2 (Chromium) no Windows, WKWebView no macOS e WebKitGTK no Linux.
WebKitGTK não oferece WebCodecs utilizável e o WKWebView tem cobertura parcial. A troca quebraria
gravação e export em duas das três plataformas. O Chromium embarcado é o que torna o produto
possível; o peso real está no que rodamos em cima dele.

### Estética Apple por implementação própria

Fonte variável embarcada calibrada às métricas de SF Pro, set de ícones desenhado na grade e no peso
óptico dos SF Symbols, e material de vidro construído à mão em camadas conforme `DESIGN.md` §5.
Renderiza igual nas três plataformas e não depende de licença de terceiros.

**Consequência documental obrigatória:** `DESIGN.md` §4 ("sem fallback para fontes de terceiros — o
app roda exclusivamente em macOS") e §7, mais `UX-PRINCIPLES.md` Parte 5 ("todo ícone funcional usa
SF Symbols reais, direto da biblioteca do sistema"), contradizem esta decisão e precisam ser
emendados na Fase 7. Nenhum outro valor desses documentos muda. Na mesma fase, `README.md`,
`ROADMAP.md` e `CLAUDE.md` deixam de declarar o produto como macOS-only, já que as três plataformas
seguem suportadas.

### Nenhuma biblioteca de animação

`gsap` tem 0 usos e `motion` tem 1. Todo o motion passa a ser CSS/WAAPI, restrito a `transform` e
`opacity` (compositor-only), incluindo a animação-assinatura do diafragma — que é rotação de paths
SVG e cabe em WAAPI. Ambas as dependências saem.

## Diagnóstico (medido em 2026-07-29)

| Fonte de peso | Evidência | Natureza |
|---|---|---|
| Multiprocesso | 5 `BrowserWindow` em `electron/windows.ts` (HUD, editor, source selector, countdown, notes) | RAM base |
| Throttling | 4 janelas com `backgroundThrottling: false` fixo | CPU ocioso |
| Dependências mortas | `gsap`, `emoji-picker-react` (34M), `mp4box` — 0 usos; `react-icons` (84M) em 2 arquivos | disco + bundle |
| Config Electron | sem `sandbox`, sem Fuses, sem V8 compile cache; `webSecurity: false` no editor | startup + segurança |
| Renderer | `VideoEditor.tsx` 3353 linhas, `SettingsPanel.tsx` 2221, `TimelineEditor.tsx` 1873, `useScreenRecorder.ts` 1870 — estado concentrado, re-render em cascata | CPU/GPU na edição |
| Bundle | 3,4 MB: `transformers` 802K (lazy, só em legendas), `VideoEditor` 723K, `index` 600K, `pixi` 530K, `react-vendor` 448K | startup do editor |
| Camada visual | 0 tokens do `DESIGN.md` aplicados, nenhuma `font-family` declarada | construção, não dívida |

Base de código: ~53k LOC TS/TSX. Testes: 57 arquivos, concentrados em `lib/exporter` e utilitários
puros; nenhum benchmark, nenhuma verificação de conformidade visual.

## Arquitetura da solução — quatro pilares

### Pilar A — Orçamento de processo

Cada `BrowserWindow` é um processo de renderer completo. O trabalho:

- Countdown e source selector deixam de ser janelas com árvore React própria — viram camadas dentro
  de janela existente ou janelas de HTML/CSS puro, sem React nem Tailwind runtime.
- `backgroundThrottling: false` passa a ser alternado em runtime (ligado apenas no HUD e no editor
  **durante** gravação), em vez de fixo na criação.
- `sandbox: true` onde o preload permitir; Electron Fuses habilitadas (`runAsNode` off, integridade
  de ASAR, inspeção Node off); V8 compile cache no processo principal.
- `webSecurity: false` no editor é investigado e removido se a razão de existir puder ser resolvida
  por protocolo customizado.

**Interface:** `electron/windows.ts` expõe criação de janelas; a mudança é interna a ele mais um
módulo novo de política de throttling consumido por `electron/ipc/`.

### Pilar B — Poda de dependências e empacotamento

- Remoção de `gsap`, `motion`, `emoji-picker-react`, `mp4box`.
- `react-icons` e `lucide-react` substituídos pelo set de ícones próprio (Pilar D).
- Auditoria do que `electron-builder.json5` empacota por plataforma — `onnxruntime-node` (92M) só
  deve ir onde é usado.
- Revisão do `manualChunks` do `vite.config.ts` contra os budgets reais.

### Pilar C — Runtime do renderer

- Estado do editor migra do componente para stores com seletores; consumidores assinam fatias, não
  o objeto inteiro.
- Arquivos acima de ~600 linhas são divididos por responsabilidade, com fronteira explícita: cada
  módulo responde o que faz, como se usa e de que depende.
- Trabalho por frame consolidado no `rafCoalescer` já existente (`videoPlayback/rafCoalescer.ts`).
- `OffscreenCanvas` no preview.
- **Meta verificável:** zero re-render de React no caminho de reprodução — o preview é canvas.

### Pilar D — Camada de design como código verificável

- Fonte única de tokens em TypeScript, gerando CSS custom properties e o Tailwind config a partir do
  mesmo dado. Valores vêm literalmente de `DESIGN.md` §3, §4, §5, §6, §8.
- Fonte variável embarcada, subsetada, com métricas calibradas.
- Sprite SVG de ícones próprios, na grade e no peso óptico dos SF Symbols.
- Primitiva `<Glass level={1|2|3}>` que garante as três camadas de `DESIGN.md` §5 — nenhuma tela
  aplica `backdrop-filter` diretamente.
- Tokens de motion expostos como utilitários WAAPI, com as duas curvas e as três durações de §8.

**Guardrails automáticos (falham o build):** `backdrop-filter` fora da primitiva `Glass`; vidro
aninhado em vidro; valor de espaçamento fora da escala base-4 de §6; `font-weight` acima de 700;
contraste calculado abaixo de 4.5:1 para Corpo e menores; animação sem variante
`prefers-reduced-motion`; controle interativo com área de clique menor que 32×32.

## Fases

Cada fase termina com os budgets do CI verdes e é mergeável sozinha. O app permanece utilizável em
todas elas.

| # | Fase | Entrega | Depende de |
|---|---|---|---|
| 0 | Baseline e instrumentação | Suíte de medição rodando contra o app atual; números registrados como baseline versionado | — |
| 1 | Poda e configuração do Electron | Pilares A + B | 0 |
| 2 | Camada de design | Pilar D: tokens, fonte, ícones, `Glass`, motion, guardrails. Nenhuma tela muda | 0 |
| 3 | HUD | Primeira superfície reconstruída, com a animação-assinatura de §8 | 2 |
| 4 | Launch, source selector, countdown, notes | Superfícies restantes fora do editor | 2, 3 |
| 5 | Editor | Pilar C + reconstrução visual. Subdividida em plano próprio | 2, 4 |
| 6 | Timeline | Última superfície | 5 |
| 7 | Endurecimento | Budgets apertados nos números conquistados; emenda de `DESIGN.md` §4/§7 e `UX-PRINCIPLES.md` Parte 5 | todas |

A Fase 5 é a maior (~10k LOC entre editor, settings, playback e anotações) e receberá seu próprio
ciclo de spec e plano quando as fases anteriores estiverem fechadas.

## Estratégia de teste e medição

### Testes

- **Unitários** (Vitest, jsdom) ao lado do código, como já é a convenção do repo.
- **Conformidade de design** — testes que executam os guardrails do Pilar D sobre os componentes
  construídos, incluindo o checklist de `DESIGN.md` §12.
- **Regressão visual** por superfície, a partir da Fase 3, em ambiente headless determinístico.
- **Browser** (`vitest.browser.config.ts`) onde renderização real de DOM/Pixi importa.
- **E2E** (Playwright) para os fluxos gravar → editar → exportar.

### Benchmarks e orçamentos

Arquivo de budgets versionado, comparado a cada PR. Regressão quebra o build.

| Métrica | Como se mede |
|---|---|
| Tamanho por chunk e do instalador | saída do build, comparada ao budget |
| Startup | do spawn ao primeiro frame do HUD, instrumentado no processo principal |
| Memória | RSS ocioso e em gravação, somado sobre todos os processos, via API de métricas do Electron |
| Captura | frames perdidos por minuto sobre fonte sintética |
| Export | throughput sobre vídeo-fixture fixo |
| Render | contagem de re-renders em cenários fixos (scrub, zoom, arrastar região) |
| Conformidade | guardrails do Pilar D + contraste + `prefers-reduced-motion` + alvo de clique |

**Limitação assumida:** o CI roda em Linux, então os números medem tendência e pegam regressão
relativa. Valores absolutos por plataforma ficam em job manual por plataforma, executado nos marcos
de fase.

## Tratamento de erro

O endurecimento do pipeline (objetivo declarado do fork) entra pelas bordas já cobertas por teste:
falha de captura, permissão negada, disco cheio e export interrompido produzem estado observável e
mensagem conforme a voz de `DESIGN.md` §10 — afirmam o fato e dão o caminho, sem pedir desculpa.
Nenhuma falha silenciosa: todo caminho de erro que hoje termina em `catch` vazio ganha telemetria
local e teste.

## Riscos

- **A Fase 5 domina o cronograma.** Mitigado por spec e plano próprios, e por ela só começar com as
  fases anteriores fechadas.
- **Budgets em CI Linux não capturam regressão específica de macOS/Windows.** Mitigado pelo job
  manual por plataforma nos marcos.
- **"Idêntico ao ecossistema Apple" tem teto na tipografia.** Uma fonte substituta calibrada chega
  perto, não é igual. O teto é aceito explicitamente.
- **Reduzir número de renderers pode afetar comportamento de janela** (click-through do HUD,
  overlays sobre fullscreen). Cada conversão de janela em camada exige verificação manual nas três
  plataformas antes do merge.

## Critérios de sucesso

1. Nenhuma feature de `README.md#core-features` removida ou degradada.
2. Baseline registrado na Fase 0 e melhora demonstrada por número em memória, CPU, startup e tamanho
   de instalador.
3. Toda superfície de UI construída sobre a camada de design, com os guardrails verdes.
4. Budgets no CI quebrando o build em regressão.
5. `DESIGN.md` e `UX-PRINCIPLES.md` consistentes com o código ao fim da Fase 7.
