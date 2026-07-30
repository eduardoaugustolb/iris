# Íris — Fase 3: HUD de gravação — design

Este documento é a spec da Fase 3 do plano de fundação (`docs/superpowers/plans/2026-07-29-iris-fundacao-fases-0-2.md`, Fases 0-2 já concluídas). Fase 3 é a primeira superfície de produto construída sobre a camada de design (tokens, `Glass`, ícones, motion) fechada na Fase 2.

## Contexto e estado atual

O HUD de gravação já existe funcionalmente, mas não visualmente. `electron/windows.ts` cria uma `BrowserWindow` frameless/transparente/always-on-top (`createHudOverlayWindow`) que carrega `index.html?windowType=hud-overlay`. `App.tsx` roteia esse `windowType` inteiro para `LaunchWindow.tsx` — um componente de 1291 linhas que acumula duas responsabilidades: seleção de fonte pré-gravação e o HUD durante a gravação (`recording === true`), tudo em Tailwind cru, sem tokens/`Glass`/`Icon`/motion da Fase 2.

O estado "gravando" de `LaunchWindow` hoje renderiza: botão principal (parar + timer, ícone via `react-icons`), pausar/retomar (condicionado a `canPauseRecording`), reiniciar, cancelar, notas (oculto no Linux via `isLinuxHud`), e uma tray lateral com menu de idioma. Todos consomem hooks já existentes em `LaunchWindow` (`recording`, `paused`, `elapsedSeconds`, `togglePaused`, `canPauseRecording`, `restartRecording`, `cancelRecording`) — essa lógica de estado é correta e não muda nesta fase.

Não existe hoje nenhum asset de "diafragma de 6 lâminas" (o sprite `src/design/icons/sprite.svg` só tem símbolos estáticos simples: `icon-record`, `icon-stop`, `icon-pause`, etc.), nem nenhum orçamento numérico de re-render fixado (a Task 6 da Fase 0 criou só a ferramenta de medição — `src/lib/perf/renderCounter.tsx` — sem threshold).

## Escopo

**Atualização pós-brainstorm inicial:** ao levantar o JSX real de `LaunchWindow.tsx` para escrever o plano de implementação, ficou claro que a barra do HUD não se divide em dois blocos limpos (pré-gravação vs. gravando) — é um único container compartilhando chrome (drag handle, toggle de layout, Glass do container) entre os dois estados; só botões individuais são condicionados. Extrair "apenas o estado gravando" fragmentaria essa chrome compartilhada. Escopo revisado com o usuário: `HudOverlay` passa a cobrir **a barra inteira** (chrome + controles de ambos os estados), não só o estado "gravando". `LaunchWindow` continua dona de 100% do estado/hooks/refs/effects; `HudOverlay` e seus subcomponentes são puramente apresentacionais. Ver `docs/superpowers/plans/2026-07-30-iris-hud-fase3.md` para a árvore de componentes resultante.

**Dentro do escopo:**
- Extrair um componente `HudOverlay` novo, cobrindo **a barra inteira do HUD** (chrome compartilhada + controles de seleção de fonte pré-gravação + controles do estado "gravando"). A lógica de estado permanece 100% em `LaunchWindow`.
- Paridade funcional completa com o estado "gravando" de hoje: botão principal com animação de diafragma, timer, pausar/retomar, reiniciar, cancelar, notas, menu de idioma.
- Migrar todos os ícones do HUD que hoje vêm de `react-icons`/`lucide-react` para o sprite próprio Íris (`Icon`/`sprite.svg`), desenhando os símbolos que faltam no mesmo estilo/grid dos existentes: `icon-resume`, `icon-restart`, `icon-cancel`, `icon-notes`, `icon-language`, `icon-studio` (verificar nomes exatos contra os usos reais em `LaunchWindow.tsx` durante a implementação).
- A animação-assinatura do diafragma (`DESIGN.md` §8): botão de iniciar grava = próprio diafragma do logo, 6 lâminas giram e fecham até o centro em `--duration-slow`/`--ease-spring`, revelando `--semantic-recording`. `prefers-reduced-motion`: crossfade de 150ms sem rotação.
- Um orçamento de re-render mensurável via `renderCounter` (ver "Orçamento de render" abaixo).

**Fora do escopo (fases futuras, não iniciar sem novo brainstorm):**
- Qualquer outra janela/superfície fora da barra do HUD (editor, seletor de fonte que abre em janela própria, countdown, notas).
- Amostragem por percentil em `scripts/bench/runtime.ts` (já flagado como pendência da Fase 0/CI).

## Arquitetura

- **`src/components/hud/HudOverlay.tsx`** (novo) — recebe como props todo o estado/callbacks de gravação hoje internos a `LaunchWindow` (não migra nenhum hook). `LaunchWindow` passa a renderizar `<HudOverlay ... />` no lugar do bloco JSX atual quando `recording === true`. `LaunchWindow` continua sendo o único dono desse estado.
- **`src/components/hud/RecordingTimer.tsx`** (novo) — `React.memo`, props `{ elapsedSeconds, paused }` apenas. Único nó da árvore que deve re-renderizar a cada tick de segundo.
- **`src/components/hud/DiaphragmButton.tsx`** (novo) — o botão principal. Não usa o padrão `<use href="#icon-x">` do sprite (não comporta animação por lâmina individual); monta 6 `<path>` próprios e anima via WAAPI. Recebe `{ recording, paused, saving, elapsedSeconds, onClick }`.
- Resto dos controles do estado "gravando" (pausar/retomar, reiniciar, cancelar, notas, idioma) reconstruídos dentro de `HudOverlay` sobre `Glass` (nível/raio conforme `DESIGN.md` §5), tokens de cor/espaço/tipografia, e `Icon` do sprite ampliado.
- `sprite.svg` ganha os símbolos novos listados acima, seguindo o `viewBox`/`stroke-width`/convenções já usadas pelos 12 símbolos existentes.

## Fluxo de dados e orçamento de render

`elapsedSeconds` sobe do hook de gravação em `LaunchWindow`, passa como prop pra `HudOverlay`, que repassa só pra `RecordingTimer`. O resto da árvore de `HudOverlay` (botões, `Glass`, ícones, `DiaphragmButton` fora do trecho de transição) recebe apenas props estáveis entre ticks (`paused`, `canPauseRecording`, callbacks já estáveis via `useCallback`/refs nos hooks existentes) e deve ficar memoizado.

**Orçamento (acceptance criteria):** `createRenderCounter().Probe` envolvendo a árvore de `HudOverlay` **exceto** `RecordingTimer`; teste simula N ticks de `elapsedSeconds` (prop mudando, resto estável) e assert que `count` do `Probe` não muda entre ticks.

## Motion — detalhamento

- **Iniciar gravação:** clique no `DiaphragmButton` → as 6 lâminas giram/fecham até o centro em `--duration-slow` (420ms) com `--ease-spring`, revelando o ponto `--semantic-recording` onde estava o vazio central. Única animação orquestrada/elaborada do produto (`DESIGN.md` §8) — dispara só nessa transição.
- **Parar gravação:** ponto vermelho → ícone parado do diafragma (35% aberto) via crossfade utilitário padrão (150-280ms, sem rotação). Não reverte a animação de lâminas — decisão explícita desta spec, já que `DESIGN.md` §8 não cobre o sentido inverso e classifica a animação de lâminas como acontecendo uma única vez.
- **`prefers-reduced-motion`:** crossfade de 150ms sem rotação, nos dois sentidos (iniciar e parar).
- Resto dos controles do HUD (hover, toggle de pausar) seguem o motion utilitário padrão já definido em `src/design/tokens/motion.ts` (fade + micro-scale 0.98→1, nunca bounce/rotação) — nenhuma exceção nova.

## Testes

- RTL: cada controle migrado (pausar/retomar, reiniciar, cancelar, notas, idioma) cobre os mesmos casos que `LaunchWindow.test.tsx` já cobre hoje para o estado "gravando" — muda só o alvo do componente sob teste.
- Motion: assert que o clique de iniciar dispara Web Animations com `duration`/`easing` batendo `--duration-slow`/`--ease-spring`; mock de `prefers-reduced-motion` cobrindo crossfade sem rotação nos dois sentidos.
- `renderCounter`: teste do orçamento descrito acima.
- Guardrail (se aplicável): se algum guardrail de `src/design/guardrails/` já varre por `backdrop-filter` fora de `Glass.tsx` ou cores fora de token, `HudOverlay`/`DiaphragmButton` devem passar sem exceção nova.
- Verificação manual em Electron real (offscreen), não só jsdom, antes de dar a tarefa do diafragma por concluída — motion CSS/WAAPI e o próprio sprite já tiveram bug que só apareceu em Chromium real (Fase 2, Task 27).

## Não-decisões explícitas (evitar escopo oculto)

- Não migrar a seleção de fonte de `LaunchWindow` nesta fase.
- Não alterar `createHudOverlayWindow` em `electron/windows.ts` (dimensões, always-on-top, comportamento de Space) — só o conteúdo React interno muda.
- Não introduzir biblioteca de animação — WAAPI apenas, como já decidido para o projeto inteiro.
